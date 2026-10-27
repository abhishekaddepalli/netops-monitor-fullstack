<?php

namespace App\Services;

use App\Events\IncidentCreated;
use App\Events\IncidentResolved;
use App\Models\Incident;
use App\Models\Monitor;
use Illuminate\Support\Facades\Log;

class IncidentManager
{
    /**
     * Called by ProcessCheckResultJob whenever a monitor's status flips.
     * down/degraded -> opens (or reuses) an incident.
     * up -> resolves any open incident for that monitor.
     */
    public function handleStatusChange(Monitor $monitor, string $newStatus, ?string $reason = null): void
    {
        match ($newStatus) {
            'down', 'degraded' => $this->openIncident($monitor, $newStatus, $reason),
            'up' => $this->resolveOpenIncident($monitor),
            default => null,
        };
    }

    private function openIncident(Monitor $monitor, string $status, ?string $reason): Incident
    {
        $existing = $monitor->incidents()->whereNot('state', 'resolved')->latest()->first();
        if ($existing) {
            return $existing;
        }

        $incident = Incident::create([
            'organization_id' => $monitor->organization_id,
            'monitor_id' => $monitor->id,
            'title' => $this->buildTitle($monitor, $status, $reason),
            'severity' => $status === 'down' ? 'critical' : 'degraded',
            'state' => 'investigating',
            'is_auto_created' => true,
            'started_at' => now(),
        ]);

        $incident->updates()->create([
            'state' => 'investigating',
            'message' => "Auto-incident created — {$monitor->confirmation_failures} consecutive failed checks. ".($reason ?? ''),
            'is_system_generated' => true,
        ]);

        // 1. Dispatch multi-channel alerts IMMEDIATELY so notifications are never delayed by queues
        try {
            app(AlertDispatcher::class)->notifyIncidentOpened($incident);
        } catch (\Throwable $e) {
            Log::error("AlertDispatcher error in notifyIncidentOpened: " . $e->getMessage());
        }

        // 2. Broadcast real-time event (Pusher / WebSocket) safely
        try {
            event(new IncidentCreated($incident));
        } catch (\Throwable $e) {
            Log::warning("Failed to broadcast IncidentCreated: " . $e->getMessage());
        }

        return $incident;
    }

    private function resolveOpenIncident(Monitor $monitor): void
    {
        $incident = $monitor->incidents()->whereNot('state', 'resolved')->latest()->first();
        if (! $incident) {
            return;
        }

        $incident->resolve(null, 'Monitor recovered — '.$monitor->confirmation_successes.' consecutive successful checks.');

        // 1. Dispatch multi-channel recovery alerts IMMEDIATELY
        try {
            app(AlertDispatcher::class)->notifyIncidentResolved($incident);
        } catch (\Throwable $e) {
            Log::error("AlertDispatcher error in notifyIncidentResolved: " . $e->getMessage());
        }

        // 2. Broadcast real-time recovery event safely
        try {
            event(new IncidentResolved($incident));
        } catch (\Throwable $e) {
            Log::warning("Failed to broadcast IncidentResolved: " . $e->getMessage());
        }
    }

    private function buildTitle(Monitor $monitor, string $status, ?string $reason): string
    {
        $verb = $status === 'down' ? 'is down' : 'is degraded';

        return "{$monitor->name} {$verb}".($reason ? " — {$reason}" : '');
    }
}
