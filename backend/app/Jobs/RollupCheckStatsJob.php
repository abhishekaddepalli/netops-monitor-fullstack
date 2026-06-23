<?php

namespace App\Jobs;

use App\Models\CheckRollupDaily;
use App\Models\CheckRollupHourly;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Scheduled hourly. Aggregates the *previous* full hour of raw `checks` rows
 * into check_rollups_hourly (one row per monitor per hour), and once a day
 * rolls the previous full day's hourly rollups into check_rollups_daily.
 *
 * This is the piece that makes "scalability for 100,000+ monitors" actually
 * true rather than aspirational: without it, every uptime%/SLA/status-page
 * query would have to scan raw check rows (at 100k monitors x 1-min interval
 * that's ~144M rows/day). With it, those queries hit a table with roughly
 * 100k rows per hour instead.
 */
class RollupCheckStatsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(): void
    {
        $this->rollupHour(now()->subHour()->startOfHour());

        // Daily rollup only runs once, shortly after midnight, rolling up
        // yesterday's now-complete 24 hourly buckets.
        if (now()->hour === 1) {
            $this->rollupDay(now()->subDay()->startOfDay());
        }

        $this->pruneOldRawChecks();
    }

    private function rollupHour(Carbon $hourStart): void
    {
        $hourEnd = $hourStart->copy()->addHour();

        $stats = DB::table('checks')
            ->selectRaw('
                monitor_id,
                COUNT(*) as total_checks,
                SUM(CASE WHEN result = "up" THEN 1 ELSE 0 END) as up_checks,
                SUM(CASE WHEN result = "down" THEN 1 ELSE 0 END) as down_checks,
                SUM(CASE WHEN result = "degraded" THEN 1 ELSE 0 END) as degraded_checks,
                AVG(response_time_ms) as avg_response_time_ms,
                MIN(response_time_ms) as min_response_time_ms,
                MAX(response_time_ms) as max_response_time_ms
            ')
            ->whereBetween('checked_at', [$hourStart, $hourEnd])
            ->groupBy('monitor_id')
            ->get();

        foreach ($stats as $row) {
            $uptimePct = $row->total_checks > 0
                ? round(($row->up_checks / $row->total_checks) * 100, 3)
                : 100;

            CheckRollupHourly::updateOrCreate(
                ['monitor_id' => $row->monitor_id, 'hour_bucket' => $hourStart],
                [
                    'total_checks' => $row->total_checks,
                    'up_checks' => $row->up_checks,
                    'down_checks' => $row->down_checks,
                    'degraded_checks' => $row->degraded_checks,
                    'avg_response_time_ms' => $row->avg_response_time_ms ? (int) round($row->avg_response_time_ms) : null,
                    'min_response_time_ms' => $row->min_response_time_ms,
                    'max_response_time_ms' => $row->max_response_time_ms,
                    'uptime_pct' => $uptimePct,
                ]
            );
        }
    }

    private function rollupDay(Carbon $dayStart): void
    {
        $dayEnd = $dayStart->copy()->addDay();

        $stats = DB::table('check_rollups_hourly')
            ->selectRaw('
                monitor_id,
                SUM(total_checks) as total_checks,
                SUM(up_checks) as up_checks,
                SUM(down_checks) as down_checks,
                SUM(degraded_checks) as degraded_checks,
                AVG(avg_response_time_ms) as avg_response_time_ms
            ')
            ->whereBetween('hour_bucket', [$dayStart, $dayEnd])
            ->groupBy('monitor_id')
            ->get();

        $intervalByMonitor = DB::table('monitors')->pluck('check_interval_seconds', 'id');

        foreach ($stats as $row) {
            $uptimePct = $row->total_checks > 0
                ? round(($row->up_checks / $row->total_checks) * 100, 3)
                : 100;

            // Approximate downtime seconds: down-checks * that monitor's interval.
            // Good enough precision for daily SLA reporting; exact-second downtime
            // tracking would require reading incident start/resolve timestamps instead.
            $interval = $intervalByMonitor[$row->monitor_id] ?? 60;
            $downtimeSeconds = $row->down_checks * $interval;

            CheckRollupDaily::updateOrCreate(
                ['monitor_id' => $row->monitor_id, 'day_bucket' => $dayStart->toDateString()],
                [
                    'total_checks' => $row->total_checks,
                    'up_checks' => $row->up_checks,
                    'down_checks' => $row->down_checks,
                    'degraded_checks' => $row->degraded_checks,
                    'avg_response_time_ms' => $row->avg_response_time_ms ? (int) round($row->avg_response_time_ms) : null,
                    'uptime_pct' => $uptimePct,
                    'downtime_seconds' => $downtimeSeconds,
                ]
            );
        }
    }

    private function pruneOldRawChecks(): void
    {
        $cutoff = now()->subDays(config('monitoring.raw_checks_retention_days'));

        DB::table('checks')->where('checked_at', '<', $cutoff)
            ->orderBy('id')
            ->chunkById(5000, function ($rows) {
                DB::table('checks')->whereIn('id', $rows->pluck('id'))->delete();
            });
    }
}
