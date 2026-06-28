<?php

namespace App\Services\Monitors;

use App\Models\Monitor;
use InvalidArgumentException;

class MonitorCheckerFactory
{
    /**
     * SNMP, MikroTik, and Radius checkers (ISP module) are intentionally not
     * included in this pass — they need protocol libraries (php-snmp ext,
     * RouterOS API client) beyond this build's scope. Wiring a new type in
     * is a one-line addition here once that checker class exists.
     */
    private const MAP = [
        'http' => HttpChecker::class,
        'api' => ApiChecker::class,
        'ping' => PingChecker::class,
        'tcp_port' => TcpPortChecker::class,
        'ssl' => SslChecker::class,
        'dns' => DnsChecker::class,
        'heartbeat' => HeartbeatChecker::class,
        'server_agent' => HeartbeatChecker::class,
        'snmp' => SnmpChecker::class,
    ];

    public static function make(Monitor $monitor): MonitorCheckerInterface
    {
        $class = self::MAP[$monitor->type] ?? null;

        if (! $class) {
            throw new InvalidArgumentException("No checker implemented for monitor type [{$monitor->type}]. Supported: ".implode(', ', array_keys(self::MAP)));
        }

        return app($class);
    }

    public static function supportedTypes(): array
    {
        return array_keys(self::MAP);
    }
}
