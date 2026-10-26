<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Incident;
use App\Models\Monitor;
use App\Models\SslCertificate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function summary(Request $request): JsonResponse
    {
        $org = $request->attributes->get('organization');

        $statusCounts = Monitor::where('organization_id', $org->id)
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        $totalMonitors = $statusCounts->sum();
        $upCount = $statusCounts->get('up', 0);

        $monitorIds = Monitor::where('organization_id', $org->id)->pluck('id');

        // Calculate overall uptime from raw checks for live updates
        $checksData = DB::table('checks')
            ->whereIn('monitor_id', $monitorIds)
            ->where('checked_at', '>=', now()->subDay())
            ->selectRaw('
                COUNT(*) as total_checks,
                SUM(CASE WHEN result = \'up\' THEN 1 ELSE 0 END) as up_checks,
                AVG(response_time_ms) as avg_response_time_ms
            ')->first();

        $uptimePct = 100;
        if ($checksData && $checksData->total_checks > 0) {
            $uptimePct = round(($checksData->up_checks / $checksData->total_checks) * 100, 2);
        } else {
            // Fallback to all-time checks if no checks in last 24h
            $allTimeChecks = DB::table('checks')
                ->whereIn('monitor_id', $monitorIds)
                ->selectRaw('
                    COUNT(*) as total_checks,
                    SUM(CASE WHEN result = \'up\' THEN 1 ELSE 0 END) as up_checks
                ')->first();
            if ($allTimeChecks && $allTimeChecks->total_checks > 0) {
                $uptimePct = round(($allTimeChecks->up_checks / $allTimeChecks->total_checks) * 100, 2);
            }
        }

        $avgResponseTime = $checksData ? $checksData->avg_response_time_ms : null;
        if ($avgResponseTime === null || $avgResponseTime == 0) {
            // Fallback 1: latest checks across all monitors
            $latestAvg = DB::table('checks')
                ->whereIn('monitor_id', $monitorIds)
                ->whereNotNull('response_time_ms')
                ->where('response_time_ms', '>', 0)
                ->latest('checked_at')
                ->limit(100)
                ->avg('response_time_ms');
            if ($latestAvg !== null && $latestAvg > 0) {
                $avgResponseTime = $latestAvg;
            } else {
                // Fallback 2: average from monitors' cached last_response_time_ms
                $monitorsAvg = Monitor::where('organization_id', $org->id)
                    ->whereNotNull('last_response_time_ms')
                    ->where('last_response_time_ms', '>', 0)
                    ->avg('last_response_time_ms');
                if ($monitorsAvg !== null && $monitorsAvg > 0) {
                    $avgResponseTime = $monitorsAvg;
                }
            }
        }

        $activeIncidents = Incident::where('organization_id', $org->id)->whereNot('state', 'resolved');

        $sslExpiringSoon = SslCertificate::whereIn('monitor_id', $monitorIds)
            ->whereNotNull('days_remaining')
            ->where('days_remaining', '<=', 30)
            ->where('is_valid', true)
            ->orderBy('days_remaining')
            ->with('monitor:id,name,target')
            ->limit(5)
            ->get();

        $recentIncidents = (clone $activeIncidents)
            ->with('monitor:id,name')
            ->orderByDesc('created_at')
            ->limit(5)
            ->get()
            ->map(fn ($inc) => [
                'id' => $inc->id,
                'monitor_id' => $inc->monitor_id,
                'monitor_name' => $inc->monitor->name ?? 'Unknown',
                'state' => $inc->state,
                'error_message' => $inc->error_message,
                'started_at' => $inc->started_at,
                'severity' => $inc->severity
            ]);

        return response()->json([
            'overall_uptime_pct' => $uptimePct,
            'avg_response_time_ms' => $avgResponseTime ? (int) round($avgResponseTime) : null,
            'monitors' => [
                'total' => $totalMonitors,
                'up' => $upCount,
                'down' => $statusCounts->get('down', 0),
                'degraded' => $statusCounts->get('degraded', 0),
                'paused' => $statusCounts->get('paused', 0),
                'pending' => $statusCounts->get('pending', 0),
            ],
            'active_incidents_count' => $activeIncidents->count(),
            'active_incidents_critical' => (clone $activeIncidents)->where('severity', 'critical')->count(),
            'recent_active_incidents' => $recentIncidents,
            'ssl_expiring_soon' => $sslExpiringSoon->map(fn ($c) => [
                'monitor_name' => $c->monitor->name,
                'target' => $c->monitor->target,
                'days_remaining' => $c->days_remaining,
            ]),
        ]);
    }

    /** Response-time series for the dashboard chart — reads from raw checks for live updates. */
    public function responseTimeSeries(Request $request): JsonResponse
    {
        $org = $request->attributes->get('organization');
        $hours = min(720, $request->integer('hours', 24)); // cap at 30 days of points

        // Determine bucket size based on the range to avoid too many points
        // For 24h -> group by hour
        // For 7d/30d -> group by day
        $groupBy = $hours > 24 ? '%Y-%m-%d 00:00:00' : '%Y-%m-%d %H:00:00';

        $monitorIds = Monitor::where('organization_id', $org->id)->pluck('id');

        $driver = DB::connection()->getDriverName();
        if ($driver === 'mysql') {
            if ($hours <= 1) {
                $groupBySql = "DATE_FORMAT(checked_at, '%Y-%m-%d %H:%i:00')";
            } elseif ($hours <= 24) {
                $groupBySql = "DATE_FORMAT(DATE_SUB(checked_at, INTERVAL MINUTE(checked_at) % 15 MINUTE), '%Y-%m-%d %H:%i:00')";
            } else {
                $groupBySql = "DATE_FORMAT(checked_at, '%Y-%m-%d 00:00:00')";
            }
        } else {
            if ($hours <= 1) {
                $groupBySql = "strftime('%Y-%m-%d %H:%M:00', checked_at)";
            } else {
                $groupBySql = $hours > 24 ? "strftime('%Y-%m-%d 00:00:00', checked_at)" : "strftime('%Y-%m-%d %H:00:00', checked_at)";
            }
        }

        $series = DB::table('checks')
            ->whereIn('monitor_id', $monitorIds)
            ->where('checked_at', '>=', now()->subHours($hours))
            ->selectRaw("{$groupBySql} as hour_bucket, AVG(response_time_ms) as avg_ms")
            ->groupBy('hour_bucket')
            ->orderBy('hour_bucket')
            ->get();

        if ($series->isEmpty() && $monitorIds->isNotEmpty()) {
            // Fallback: fetch most recent checks without the strict subHours cutoff
            $recentChecks = DB::table('checks')
                ->whereIn('monitor_id', $monitorIds)
                ->whereNotNull('response_time_ms')
                ->where('response_time_ms', '>', 0)
                ->orderByDesc('checked_at')
                ->limit(50)
                ->get(['checked_at', 'response_time_ms']);

            if ($recentChecks->isNotEmpty()) {
                $series = $recentChecks->sortBy('checked_at')->map(fn ($c) => (object) [
                    'hour_bucket' => $c->checked_at,
                    'avg_ms' => round((float) $c->response_time_ms, 1),
                ])->values();
            } else {
                // Synthesize from monitors' last_response_time_ms if available
                $monitorsWithData = Monitor::where('organization_id', $org->id)
                    ->whereNotNull('last_response_time_ms')
                    ->where('last_response_time_ms', '>', 0)
                    ->get(['last_checked_at', 'last_response_time_ms', 'updated_at']);

                if ($monitorsWithData->isNotEmpty()) {
                    $avgMs = round($monitorsWithData->avg('last_response_time_ms'), 1);
                    $rawTime = $monitorsWithData->max('last_checked_at') ?? now()->toDateTimeString();
                    $timePoint = is_string($rawTime) ? $rawTime : $rawTime->toDateTimeString();
                    $prevPoint = date('Y-m-d H:i:s', strtotime($timePoint) - 3600);
                    $series = collect([
                        (object) ['hour_bucket' => $prevPoint, 'avg_ms' => $avgMs],
                        (object) ['hour_bucket' => $timePoint, 'avg_ms' => $avgMs],
                    ]);
                }
            }
        }

        if ($series->count() === 1) {
            $single = $series->first();
            $prevTime = date('Y-m-d H:i:s', strtotime($single->hour_bucket) - 900);
            $series = collect([
                (object) ['hour_bucket' => $prevTime, 'avg_ms' => $single->avg_ms],
                $single,
            ]);
        }

        return response()->json($series);
    }
}
