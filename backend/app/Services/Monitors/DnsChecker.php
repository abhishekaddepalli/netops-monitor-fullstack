<?php

namespace App\Services\Monitors;

use App\Models\Monitor;

class DnsChecker implements MonitorCheckerInterface
{
    /**
     * Config shape:
     * { "record_type": "A", "expected_values": ["203.0.113.10"] }
     * If expected_values is empty, the check only verifies resolution succeeds
     * (useful for "alert me if DNS breaks" without caring about the exact IP).
     * If expected_values is set, any drift is flagged DOWN — this is how
     * "Alert on Record Changes" from the spec is implemented: point a DNS
     * monitor at the domain with the currently-correct values locked in,
     * and any change (intentional or hijack) trips an incident.
     */
    private const TYPE_MAP = [
        'A' => DNS_A, 'AAAA' => DNS_AAAA, 'MX' => DNS_MX,
        'TXT' => DNS_TXT, 'CNAME' => DNS_CNAME, 'NS' => DNS_NS,
    ];

    public function check(Monitor $monitor): CheckResult
    {
        $config = $monitor->config ?? [];
        $recordType = strtoupper($config['record_type'] ?? 'A');
        $dnsType = self::TYPE_MAP[$recordType] ?? DNS_A;

        $start = microtime(true);
        $records = @dns_get_record($monitor->target, $dnsType);
        $elapsedMs = (int) round((microtime(true) - $start) * 1000);

        if ($records === false || empty($records)) {
            return CheckResult::down("No {$recordType} records found for {$monitor->target} (propagation problem or DNS failure).", null, $elapsedMs);
        }

        $resolvedValues = $this->extractValues($records, $recordType);

        $expected = $config['expected_values'] ?? [];
        if (! empty($expected)) {
            $missing = array_diff($expected, $resolvedValues);
            $unexpected = array_diff($resolvedValues, $expected);

            if (! empty($missing) || ! empty($unexpected)) {
                return CheckResult::down(
                    'DNS record change detected — does not match expected values.',
                    null,
                    $elapsedMs,
                    ['expected' => $expected, 'resolved' => $resolvedValues]
                );
            }
        }

        return CheckResult::up($elapsedMs, null, ['record_type' => $recordType, 'resolved' => $resolvedValues]);
    }

    private function extractValues(array $records, string $type): array
    {
        return collect($records)->map(function ($r) use ($type) {
            return match ($type) {
                'A' => $r['ip'] ?? null,
                'AAAA' => $r['ipv6'] ?? null,
                'MX' => $r['target'] ?? null,
                'TXT' => $r['txt'] ?? null,
                'CNAME' => $r['target'] ?? null,
                'NS' => $r['target'] ?? null,
                default => null,
            };
        })->filter()->values()->all();
    }
}
