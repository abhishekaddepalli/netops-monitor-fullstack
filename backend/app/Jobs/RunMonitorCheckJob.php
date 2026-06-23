<?php

namespace App\Jobs;

use App\Models\Check;
use App\Models\Monitor;
use App\Services\Monitors\CheckResult;
use App\Services\Monitors\MonitorCheckerFactory;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class RunMonitorCheckJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;
    public int $timeout = 65; // slightly above the max monitor timeout (default 30s + buffer)
    public int $backoff = 5;

    public function __construct(public int $monitorId) {}

    public function handle(): void
    {
        $monitor = Monitor::find($this->monitorId);

        // Monitor may have been deleted/paused between dispatch and execution — bail quietly.
        if (! $monitor || $monitor->is_paused || $monitor->trashed()) {
            return;
        }

        if ($monitor->isInMaintenanceWindow()) {
            return;
        }

        try {
            $checker = MonitorCheckerFactory::make($monitor);
            $result = $checker->check($monitor);
        } catch (Throwable $e) {
            // Misconfiguration or unexpected exception — log it, record as a failed
            // check rather than letting the queue job retry-loop forever, and surface
            // the error message exactly like any other down result would.
            Log::warning("Monitor check threw an exception [monitor_id={$monitor->id}]: {$e->getMessage()}");
            $result = CheckResult::down('Internal check error: '.mb_substr($e->getMessage(), 0, 300));
        }

        Check::create([
            'monitor_id' => $monitor->id,
            'monitoring_node_id' => null, // set by the regional worker process in a multi-node deployment
            'result' => $result->result,
            'response_time_ms' => $result->responseTimeMs,
            'status_code' => $result->statusCode,
            'error_message' => $result->errorMessage,
            'details' => $result->details,
            'checked_at' => now(),
        ]);

        ProcessCheckResultJob::dispatchSync($monitor->id, $result->result, $result->errorMessage, $result->responseTimeMs);
    }
}
