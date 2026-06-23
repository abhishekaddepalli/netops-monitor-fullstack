<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessCheckResultJob;
use App\Models\Check;
use App\Models\Monitor;
use App\Models\ServerMetric;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HeartbeatController extends Controller
{
    /**
     * GET or POST /hb/{token} — intentionally unauthenticated (the token
     * itself is the secret) and intentionally not rate-limited beyond the
     * global API throttle, since legitimate heartbeat sources may ping
     * every 30 seconds. No request body is required; some cron tools only
     * support a bare GET request (curl, wget -q).
     */
    public function ping(Request $request, string $token): JsonResponse
    {
        $monitor = Monitor::where('heartbeat_token', $token)
            ->whereIn('type', ['heartbeat', 'server_agent'])
            ->first();

        if (! $monitor) {
            return response()->json(['error' => 'Unknown heartbeat token.'], 404);
        }

        $monitor->heartbeat_last_ping_at = now();
        $monitor->save();

        if ($monitor->type === 'server_agent' && $request->isJson()) {
            ServerMetric::create([
                'monitor_id' => $monitor->id,
                'cpu_usage_pct' => $request->input('cpu_usage_pct'),
                'ram_usage_pct' => $request->input('ram_usage_pct'),
                'disk_usage_pct' => $request->input('disk_usage_pct'),
                'interfaces' => $request->input('interfaces'),
            ]);
        }

        // Record a synthetic "up" check so this shows in the monitor's
        // history/uptime% calculations exactly like an actively-polled monitor.
        Check::create([
            'monitor_id' => $monitor->id,
            'result' => 'up',
            'checked_at' => now(),
            'details' => ['source' => 'heartbeat_ping', 'ip' => $request->ip()],
        ]);

        ProcessCheckResultJob::dispatchSync($monitor->id, 'up', null, null);

        return response()->json(['status' => 'ok', 'received_at' => now()->toIso8601String()]);
    }
}
