<?php

namespace App\Jobs;

use App\Models\Monitor;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Runs every minute (see routes/console.php scheduler). Finds every monitor
 * whose next_check_at has passed, is not paused, and not in a maintenance
 * window — then queues one RunMonitorCheckJob per monitor.
 *
 * This job itself does NOT perform any checks — it only dispatches. That
 * separation is what lets this scale to 100,000+ monitors: this job stays
 * fast (a single indexed query + chunked dispatch), and the actual slow
 * network I/O happens in parallel across as many queue workers as you run.
 */
class DispatchDueMonitorChecksJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public function handle(): void
    {
        Monitor::query()
            ->where('is_paused', false)
            ->where(function ($q) {
                $q->where('maintenance_mode', false)
                    ->orWhere('maintenance_until', '<', now());
            })
            ->where('next_check_at', '<=', now())
            ->whereNull('deleted_at')
            ->select(['id', 'check_interval_seconds', 'type'])
            ->chunkById(500, function ($monitors) {
                foreach ($monitors as $monitor) {
                    $isFastLane = $monitor->check_interval_seconds <= config('monitoring.fast_lane_max_interval_seconds');
                    $queue = $isFastLane ? config('monitoring.queue_fast') : config('monitoring.queue');

                    RunMonitorCheckJob::dispatch($monitor->id)->onQueue($queue);

                    // Bump next_check_at immediately (not after the check completes) so a
                    // slow/hanging check can't cause the same monitor to be re-queued by
                    // the next dispatch cycle before this one finishes.
                    Monitor::where('id', $monitor->id)->update([
                        'next_check_at' => now()->addSeconds($monitor->check_interval_seconds),
                    ]);
                }
            });
    }
}
