<?php

namespace App\Jobs;

use App\Events\MonitorStatusChanged;
use App\Models\Monitor;
use App\Services\IncidentManager;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;

class ProcessCheckResultJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public int $monitorId,
        public string $result,
        public ?string $errorMessage,
        public ?int $responseTimeMs,
    ) {}

    public function handle(IncidentManager $incidentManager): void
    {
        // Lock the row for the duration of the state transition — multiple
        // nodes could in theory report for the same monitor close together
        // (multi-region monitoring) and we don't want a race condition
        // flipping status back and forth incorrectly.
        DB::transaction(function () use ($incidentManager) {
            $monitor = Monitor::lockForUpdate()->find($this->monitorId);
            if (! $monitor) {
                return;
            }

            $previousStatus = $monitor->status;

            $changed = $monitor->applyCheckResult(
                $this->result,
                $monitor->confirmation_failures,
                $monitor->confirmation_successes
            );

            $monitor->last_checked_at = now();
            $monitor->last_response_time_ms = $this->responseTimeMs;
            $monitor->save();

            if ($changed) {
                try {
                    event(new MonitorStatusChanged($monitor, $previousStatus));
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::warning("Failed to broadcast MonitorStatusChanged: " . $e->getMessage());
                }
                $incidentManager->handleStatusChange($monitor, $monitor->status, $this->errorMessage);
            }
        });
    }
}
