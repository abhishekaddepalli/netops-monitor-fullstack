<?php

namespace App\Jobs;

use App\Models\AlertChannel;
use App\Models\AlertLog;
use App\Models\Incident;
use App\Services\Alerts\AlertSenderFactory;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Throwable;

class SendAlertJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 15;

    public function __construct(
        public Incident $incident,
        public AlertChannel $channel,
        public string $event, // 'down' | 'up'
        public ?int $escalationLevel,
    ) {}

    public function handle(): void
    {
        // If this is a delayed escalation step (level 2+) and the incident was
        // already acknowledged or resolved by the time the delay elapsed, skip it.
        // Level 1 (escalationLevel null/1, delay 0) always fires.
        $this->incident->refresh();

        if ($this->escalationLevel && $this->escalationLevel > 1) {
            if ($this->incident->acknowledged_at || $this->incident->state === 'resolved') {
                return;
            }
        }

        $log = AlertLog::create([
            'organization_id' => $this->incident->organization_id,
            'incident_id' => $this->incident->id,
            'monitor_id' => $this->incident->monitor_id,
            'alert_channel_id' => $this->channel->id,
            'type' => $this->channel->type,
            'event' => $this->event === 'down' ? 'down' : 'up',
            'escalation_level' => $this->escalationLevel,
            'status' => 'queued',
        ]);

        try {
            $sender = AlertSenderFactory::make($this->channel->type);
            $sender->send($this->channel, $this->incident, $this->event);

            $log->update(['status' => 'sent', 'sent_at' => now()]);
        } catch (Throwable $e) {
            $log->update(['status' => 'failed', 'failure_reason' => mb_substr($e->getMessage(), 0, 500)]);
            throw $e; // let the queue's retry/backoff handle transient failures
        }
    }
}
