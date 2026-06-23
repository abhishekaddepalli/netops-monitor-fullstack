<?php

namespace App\Services\Monitors;

use App\Models\Monitor;

class HeartbeatChecker implements MonitorCheckerInterface
{
    /**
     * Heartbeat monitors are passive: the external system (cron job, backup
     * script, billing job) pings IN to /hb/{token} on its own schedule via
     * App\Http\Controllers\Api\HeartbeatController. This checker does NOT
     * make an outbound request — it runs on the normal check cycle purely
     * to evaluate "has too much time passed since the last inbound ping?"
     *
     * Config shape: { "grace_period_seconds": 900 } // defaults to
     * interval * config('monitoring.heartbeat_grace_multiplier')
     */
    public function check(Monitor $monitor): CheckResult
    {
        $config = $monitor->config ?? [];
        $gracePeriod = $config['grace_period_seconds']
            ?? (int) ($monitor->check_interval_seconds * config('monitoring.heartbeat_grace_multiplier'));

        if (! $monitor->heartbeat_last_ping_at) {
            // Never pinged yet — only down if it's had a full grace period to do so
            // since the monitor was created (avoids false DOWN the instant it's created).
            $deadline = $monitor->created_at->addSeconds($gracePeriod);

            return now()->gt($deadline)
                ? CheckResult::down('No heartbeat received since monitor creation.')
                : CheckResult::up(null, null, ['awaiting_first_ping' => true]);
        }

        $secondsSincePing = $monitor->heartbeat_last_ping_at->diffInSeconds(now());

        if ($secondsSincePing > $gracePeriod) {
            return CheckResult::down(
                "No heartbeat received in {$secondsSincePing}s (grace period: {$gracePeriod}s).",
                null,
                null,
                ['last_ping_at' => $monitor->heartbeat_last_ping_at->toIso8601String()]
            );
        }

        return CheckResult::up(null, null, ['seconds_since_last_ping' => $secondsSincePing]);
    }
}
