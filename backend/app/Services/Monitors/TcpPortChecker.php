<?php

namespace App\Services\Monitors;

use App\Models\Monitor;

class TcpPortChecker implements MonitorCheckerInterface
{
    /**
     * Generic TCP connect check — works for every service in the spec
     * (SSH, FTP, SMTP, POP3, IMAP, HTTP, HTTPS, RDP, MySQL, PostgreSQL,
     * MongoDB, MikroTik API, Winbox, Radius, DNS, custom) because at this
     * level we're only proving the port accepts a TCP handshake, not
     * speaking the application protocol. That's intentional — it's fast,
     * has zero protocol-specific dependencies, and is what "is the service
     * reachable" monitoring means in every competing product.
     *
     * Config shape: { "service": "mysql" }  // optional, just a UI label;
     * monitor.port is the actual port used.
     */
    public function check(Monitor $monitor): CheckResult
    {
        $host = $monitor->target;
        $port = $monitor->port ?? config('monitoring.tcp_services')[$monitor->config['service'] ?? ''] ?? null;

        if (! $port) {
            return CheckResult::down('No port configured for this monitor.');
        }

        $start = microtime(true);
        $errno = $errstr = null;
        $timeout = $monitor->timeout_seconds ?? config('monitoring.default_timeout_seconds');

        $connection = @fsockopen($host, $port, $errno, $errstr, $timeout);
        $elapsedMs = (int) round((microtime(true) - $start) * 1000);

        if ($connection === false) {
            return CheckResult::down(
                $errstr ?: "Connection refused or timed out on port {$port}",
                null,
                $elapsedMs
            );
        }

        fclose($connection);

        $degradedThreshold = $monitor->config['degraded_threshold_ms'] ?? 2000;
        if ($elapsedMs > $degradedThreshold) {
            return CheckResult::degraded($elapsedMs, "Connect time {$elapsedMs}ms exceeds {$degradedThreshold}ms threshold");
        }

        return CheckResult::up($elapsedMs, null, ['port' => $port]);
    }
}
