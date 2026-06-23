<?php

use App\Jobs\CheckSslExpiryJob;
use App\Jobs\DispatchDueMonitorChecksJob;
use App\Jobs\RollupCheckStatsJob;
use Illuminate\Support\Facades\Schedule;

/*
|--------------------------------------------------------------------------
| Monitoring Engine Scheduler
|--------------------------------------------------------------------------
| Requires a single cron entry on the server:
|   * * * * * cd /path-to-app && php artisan schedule:run >> /dev/null 2>&1
| Works on shared/cPanel hosting (per the spec's "cPanel Compatible
| Deployment" requirement) since it only needs Laravel's own scheduler,
| not a long-running supervisor process for the dispatch step itself.
| Queue WORKERS (which execute RunMonitorCheckJob) still need a
| long-running process — see DEPLOYMENT.md for the cPanel-compatible
| approach (Supervisor where available, or a cron-based queue:work
| --stop-when-empty loop as a fallback on restricted shared hosts).
*/

// The heartbeat of the entire monitoring engine — checks every monitor's
// next_check_at every minute and queues whatever is due.
Schedule::job(new DispatchDueMonitorChecksJob)->everyMinute()->withoutOverlapping();

// Hourly rollup of raw checks into check_rollups_hourly (+ daily rollup once/day).
Schedule::job(new RollupCheckStatsJob)->hourly()->withoutOverlapping();

// SSL/domain expiry threshold alerts — once daily at the configured hour.
Schedule::job(new CheckSslExpiryJob)->dailyAt(sprintf('%02d:00', config('monitoring.ssl_check_hour', 2)));

// Prune expired Sanctum tokens weekly.
Schedule::command('sanctum:prune-expired --hours=24')->weekly();

// Prune audit logs daily based on retention settings.
Schedule::command('logs:prune')->daily();
