<?php

namespace App\Services;

use App\Jobs\SendAlertJob;
use App\Models\AlertChannel;
use App\Models\AlertLog;
use App\Models\Incident;
use App\Models\Monitor;
use App\Services\Alerts\AlertSenderFactory;
use Illuminate\Support\Facades\Log;
use Throwable;

class AlertDispatcher
{
    /**
     * Fires Level 1 of the monitor's escalation policy immediately (synchronously)
     * so notifications go out instantly without waiting for a queue worker.
     * Levels 2+ are scheduled (delayed dispatch) and automatically skipped if
     * acknowledged before they fire.
     */
    public function notifyIncidentOpened(Incident $incident): void
    {
        $monitor = $incident->monitor;
        if (! $monitor) {
            $monitor = Monitor::find($incident->monitor_id);
            if ($monitor) {
                $incident->setRelation('monitor', $monitor);
            }
        }
        if (! $monitor) {
            return;
        }

        $policy = $this->resolvePolicy($monitor);

        $globalChannels = AlertChannel::whereNull('organization_id')->where('is_active', true)->get();
        $orgChannels = AlertChannel::where('organization_id', $monitor->organization_id)->where('is_active', true)->get();

        if (! $policy && $globalChannels->isEmpty() && $orgChannels->isEmpty()) {
            return;
        }

        if ($policy) {
            foreach ($policy->steps as $step) {
                $channel = $step->channel;
                if (! $channel || ! $channel->is_active) {
                    continue;
                }

                if ($step->delay_minutes <= 0) {
                    // Level 1: Fire IMMEDIATELY to avoid queue delays
                    $this->sendImmediate($incident, $channel, 'down', $step->level);
                } else {
                    // Level 2+: Scheduled escalation
                    SendAlertJob::dispatch($incident, $channel, 'down', $step->level)
                        ->delay(now()->addMinutes($step->delay_minutes));
                }
            }
        } else {
            // No policy defined, alert all organization channels immediately (Level 1)
            foreach ($orgChannels as $channel) {
                $this->sendImmediate($incident, $channel, 'down', 1);
            }
        }

        // Global admin channels also alert immediately
        foreach ($globalChannels as $channel) {
            $this->sendImmediate($incident, $channel, 'down', 1);
        }
    }

    public function notifyIncidentResolved(Incident $incident): void
    {
        $monitor = $incident->monitor;
        if (! $monitor) {
            $monitor = Monitor::find($incident->monitor_id);
            if ($monitor) {
                $incident->setRelation('monitor', $monitor);
            }
        }
        if (! $monitor) {
            return;
        }

        $policy = $this->resolvePolicy($monitor);

        $globalChannels = AlertChannel::whereNull('organization_id')->where('is_active', true)->get();
        $orgChannels = AlertChannel::where('organization_id', $monitor->organization_id)->where('is_active', true)->get();

        if (! $policy && $globalChannels->isEmpty() && $orgChannels->isEmpty()) {
            return;
        }

        if ($policy) {
            foreach ($policy->steps->unique('alert_channel_id') as $step) {
                $channel = $step->channel;
                if ($channel && $channel->is_active) {
                    $this->sendImmediate($incident, $channel, 'up', null);
                }
            }
        } else {
            // Alert all org channels that the incident is resolved immediately
            foreach ($orgChannels as $channel) {
                $this->sendImmediate($incident, $channel, 'up', null);
            }
        }

        foreach ($globalChannels as $channel) {
            $this->sendImmediate($incident, $channel, 'up', null);
        }
    }

    /**
     * Executes an alert send immediately and logs success or failure.
     * Guaranteed to never crash calling code, isolating each channel.
     */
    public function sendImmediate(Incident $incident, AlertChannel $channel, string $event, ?int $escalationLevel = 1): void
    {
        if (! $channel->is_active) {
            return;
        }

        $log = AlertLog::create([
            'organization_id' => $incident->organization_id,
            'incident_id' => $incident->id,
            'monitor_id' => $incident->monitor_id,
            'alert_channel_id' => $channel->id,
            'type' => $channel->type,
            'event' => $event === 'down' ? 'down' : 'up',
            'escalation_level' => $escalationLevel,
            'status' => 'queued',
        ]);

        try {
            $sender = AlertSenderFactory::make($channel->type);
            $sender->send($channel, $incident, $event);

            $log->update([
                'status' => 'sent',
                'sent_at' => now(),
            ]);
        } catch (Throwable $e) {
            Log::error("Immediate alert failed on channel {$channel->id} ({$channel->type}): " . $e->getMessage());
            
            $log->update([
                'status' => 'failed',
                'failure_reason' => mb_substr($e->getMessage(), 0, 500),
            ]);
        }
    }

    private function resolvePolicy(Monitor $monitor)
    {
        return $monitor->escalationPolicy
            ?? ($monitor->organization ? $monitor->organization->escalationPolicies()->where('is_default', true)->first() : null);
    }
}
