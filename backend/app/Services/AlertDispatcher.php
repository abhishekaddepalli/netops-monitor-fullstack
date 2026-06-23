<?php

namespace App\Services;

use App\Jobs\SendAlertJob;
use App\Models\AlertChannel;
use App\Models\Incident;
use App\Models\Monitor;

class AlertDispatcher
{
    /**
     * Fires Level 1 of the monitor's escalation policy immediately. Levels
     * 2+ are scheduled (delayed dispatch) and automatically skipped by
     * SendAlertJob if the incident gets acknowledged before they fire —
     * see SendAlertJob::handle() for the acknowledgement check.
     */
    public function notifyIncidentOpened(Incident $incident): void
    {
        $monitor = $incident->monitor;
        $policy = $this->resolvePolicy($monitor);

        $globalChannels = AlertChannel::whereNull('organization_id')->where('is_active', true)->get();
        $orgChannels = AlertChannel::where('organization_id', $monitor->organization_id)->where('is_active', true)->get();

        if (! $policy && $globalChannels->isEmpty() && $orgChannels->isEmpty()) {
            return;
        }

        if ($policy) {
            foreach ($policy->steps as $step) {
                SendAlertJob::dispatch($incident, $step->channel, 'down', $step->level)
                    ->delay(now()->addMinutes($step->delay_minutes))
                    ->onQueue(config('monitoring.queue_fast'));
            }
        } else {
            // No policy defined, alert all organization channels immediately (Level 1)
            foreach ($orgChannels as $channel) {
                SendAlertJob::dispatch($incident, $channel, 'down', 1)->onQueue(config('monitoring.queue_fast'));
            }
        }

        foreach ($globalChannels as $channel) {
            SendAlertJob::dispatch($incident, $channel, 'down', 1)->onQueue(config('monitoring.queue_fast'));
        }
    }

    public function notifyIncidentResolved(Incident $incident): void
    {
        $monitor = $incident->monitor;
        $policy = $this->resolvePolicy($monitor);

        $globalChannels = AlertChannel::whereNull('organization_id')->where('is_active', true)->get();
        $orgChannels = AlertChannel::where('organization_id', $monitor->organization_id)->where('is_active', true)->get();

        if (! $policy && $globalChannels->isEmpty() && $orgChannels->isEmpty()) {
            return;
        }

        if ($policy) {
            foreach ($policy->steps->unique('alert_channel_id') as $step) {
                SendAlertJob::dispatch($incident, $step->channel, 'up', null)->onQueue(config('monitoring.queue_fast'));
            }
        } else {
            // Alert all org channels that the incident is resolved
            foreach ($orgChannels as $channel) {
                SendAlertJob::dispatch($incident, $channel, 'up', null)->onQueue(config('monitoring.queue_fast'));
            }
        }

        foreach ($globalChannels as $channel) {
            SendAlertJob::dispatch($incident, $channel, 'up', null)->onQueue(config('monitoring.queue_fast'));
        }
    }

    private function resolvePolicy(Monitor $monitor)
    {
        return $monitor->escalationPolicy
            ?? $monitor->organization->escalationPolicies()->where('is_default', true)->first();
    }
}
