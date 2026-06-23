<?php

namespace App\Services\Monitors;

use App\Models\Monitor;
use App\Models\SslCertificate;
use Carbon\Carbon;

class SslChecker implements MonitorCheckerInterface
{
    /**
     * Connects via TLS, extracts the leaf certificate (and chain, when
     * available), and persists structured cert data to ssl_certificates —
     * separate from the lightweight `checks` row, since cert details are
     * comparatively heavy and only change once per renewal, not every check.
     *
     * The "check" result itself just answers: is the cert currently valid
     * and not within its alert window? Actual threshold-based alerting
     * (60/30/15/7/3/1 days) is handled by App\Jobs\CheckSslExpiryJob, which
     * reads this table daily — this checker just keeps the data fresh.
     */
    public function check(Monitor $monitor): CheckResult
    {
        $host = parse_url($monitor->target, PHP_URL_HOST) ?: $monitor->target;
        $port = $monitor->port ?? 443;

        $start = microtime(true);

        $context = stream_context_create(['ssl' => [
            'capture_peer_cert' => true,
            'capture_peer_cert_chain' => true,
            'verify_peer' => false, // we want to inspect even invalid/expired certs, not refuse the connection
            'verify_peer_name' => false,
            'SNI_enabled' => true,
            'peer_name' => $host,
        ]]);

        $timeout = $monitor->timeout_seconds ?? config('monitoring.default_timeout_seconds');
        $client = @stream_socket_client(
            "ssl://{$host}:{$port}",
            $errno,
            $errstr,
            $timeout,
            STREAM_CLIENT_CONNECT,
            $context
        );

        $elapsedMs = (int) round((microtime(true) - $start) * 1000);

        if ($client === false) {
            return CheckResult::down($errstr ?: 'TLS handshake failed.', null, $elapsedMs);
        }

        $params = stream_context_get_params($client);
        fclose($client);

        if (empty($params['options']['ssl']['peer_certificate'])) {
            return CheckResult::down('Could not retrieve certificate from peer.');
        }

        $certResource = $params['options']['ssl']['peer_certificate'];
        $certData = openssl_x509_parse($certResource);

        if (! $certData) {
            return CheckResult::down('Could not parse certificate.');
        }

        $validTo = Carbon::createFromTimestamp($certData['validTo_time_t']);
        $validFrom = Carbon::createFromTimestamp($certData['validFrom_time_t']);
        $daysRemaining = (int) now()->diffInDays($validTo, false);

        $chain = [];
        foreach ($params['options']['ssl']['peer_certificate_chain'] ?? [] as $chainCert) {
            $parsed = openssl_x509_parse($chainCert);
            if ($parsed) {
                $chain[] = [
                    'subject' => $parsed['name'] ?? null,
                    'issuer' => $this->formatDn($parsed['issuer'] ?? []),
                    'valid_to' => Carbon::createFromTimestamp($parsed['validTo_time_t'])->toIso8601String(),
                ];
            }
        }

        SslCertificate::updateOrCreate(
            ['monitor_id' => $monitor->id],
            [
                'issuer' => $this->formatDn($certData['issuer'] ?? []),
                'subject' => $this->formatDn($certData['subject'] ?? []),
                'signature_algorithm' => $certData['signatureTypeSN'] ?? null,
                'serial_number' => $certData['serialNumberHex'] ?? null,
                'certificate_chain' => $chain,
                'valid_from' => $validFrom,
                'valid_to' => $validTo,
                'days_remaining' => $daysRemaining,
                'is_valid' => $daysRemaining > 0,
                'checked_at' => now(),
            ]
        );

        if ($daysRemaining <= 0) {
            return CheckResult::down("Certificate expired {$daysRemaining} days ago.", null, $elapsedMs);
        }

        return CheckResult::up($elapsedMs, null, [
            'days_remaining' => $daysRemaining,
            'issuer' => $this->formatDn($certData['issuer'] ?? []),
        ]);
    }

    private function formatDn(array $dn): string
    {
        return $dn['CN'] ?? $dn['O'] ?? implode(', ', array_map(fn ($k, $v) => "{$k}={$v}", array_keys($dn), $dn));
    }
}
