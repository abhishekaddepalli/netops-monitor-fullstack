<?php

namespace App\Services\Monitors;

use App\Models\Monitor;
use Symfony\Component\Process\Exception\ProcessFailedException;
use Symfony\Component\Process\Process;

class PingChecker implements MonitorCheckerInterface
{
    /**
     * Shells out to the system `ping` binary. PHP has no native ICMP raw
     * socket support without root, so this is the standard approach — and
     * exactly what every other uptime tool (UptimeRobot, etc.) does under
     * the hood on its check nodes. Each monitoring node server must have
     * `ping` (iputils-ping) installed; this is in the deployment docs.
     *
     * Config shape:
     * { "packet_count": 4, "ip_version": "auto" } // auto|4|6
     */
    public function check(Monitor $monitor): CheckResult
    {
        $config = $monitor->config ?? [];
        $count = max(1, min(10, $config['packet_count'] ?? 4));
        $target = $monitor->target;

        $isWindows = PHP_OS_FAMILY === 'Windows';

        $timeout = $monitor->timeout_seconds ?? config('monitoring.default_timeout_seconds');
        if ($isWindows) {
            $timeoutMs = min(2000, $timeout * 1000); // Max 2s per packet
            $process = new Process(['ping', '-n', (string) $count, '-w', (string) $timeoutMs, $target]);
        } else {
            $binary = ($config['ip_version'] ?? 'auto') === '6' ? 'ping6' : 'ping';
            $process = new Process([
                $binary, '-n', '-c', (string) $count, '-W', (string) min(10, $timeout), $target,
            ]);
        }

        $process->setTimeout($timeout + 5);

        try {
            $process->run();
        } catch (\Exception $e) {
            return CheckResult::down('Ping process failed or timed out: '.$e->getMessage());
        }

        $output = $process->getOutput();
        $stats = $this->parsePingOutput($output);

        if ($stats === null) {
            return CheckResult::down('Host unreachable or ping timed out.', null, null, ['raw_output' => mb_substr($output, 0, 500)]);
        }

        if ($stats['packet_loss_pct'] >= 100) {
            return CheckResult::down('100% packet loss.', null, null, $stats);
        }

        if ($stats['packet_loss_pct'] > 20) {
            return CheckResult::degraded(
                $stats['avg_latency_ms'],
                "{$stats['packet_loss_pct']}% packet loss detected",
                $stats
            );
        }

        return CheckResult::up($stats['avg_latency_ms'], null, $stats);
    }

    private function parsePingOutput(string $output): ?array
    {
        if (PHP_OS_FAMILY === 'Windows') {
            if (! preg_match('/Packets: Sent = (\d+), Received = (\d+), Lost = (\d+) \(([\d.]+)% loss\)/', $output, $m)) {
                return null;
            }
            $packetLoss = (float) $m[4];
            $minLatency = $avgLatency = $maxLatency = $jitter = null;
            
            if (preg_match('/Minimum = (\d+)ms, Maximum = (\d+)ms, Average = (\d+)ms/', $output, $rtt)) {
                $minLatency = (float) $rtt[1];
                $maxLatency = (float) $rtt[2];
                $avgLatency = (float) $rtt[3];
                $jitter = $maxLatency - $minLatency; // rough estimate
            }
            
            return [
                'packet_loss_pct' => $packetLoss,
                'min_latency_ms' => $minLatency !== null ? round($minLatency, 2) : null,
                'avg_latency_ms' => $avgLatency !== null ? (int) round($avgLatency) : null,
                'max_latency_ms' => $maxLatency !== null ? round($maxLatency, 2) : null,
                'jitter_ms' => $jitter !== null ? round($jitter, 2) : null,
            ];
        }

        if (! preg_match('/(\d+) packets transmitted, (\d+) received,?.*?(\d+(?:\.\d+)?)% packet loss/', $output, $m)) {
            return null;
        }

        $packetLoss = (float) $m[3];
        $minLatency = $avgLatency = $maxLatency = $jitter = null;

        if (preg_match('/[=\s]([\d.]+)\/([\d.]+)\/([\d.]+)\/([\d.]+)/', $output, $rtt)) {
            $minLatency = (float) $rtt[1];
            $avgLatency = (float) $rtt[2];
            $maxLatency = (float) $rtt[3];
            $jitter = (float) $rtt[4];
        }

        return [
            'packet_loss_pct' => $packetLoss,
            'min_latency_ms' => $minLatency !== null ? round($minLatency, 2) : null,
            'avg_latency_ms' => $avgLatency !== null ? (int) round($avgLatency) : null,
            'max_latency_ms' => $maxLatency !== null ? round($maxLatency, 2) : null,
            'jitter_ms' => $jitter !== null ? round($jitter, 2) : null,
        ];
    }
}
