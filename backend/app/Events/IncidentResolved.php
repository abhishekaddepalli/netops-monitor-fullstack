<?php

namespace App\Events;

use App\Models\Incident;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class IncidentResolved implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Incident $incident) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel("org.{$this->incident->organization_id}.incidents")];
    }

    public function broadcastAs(): string
    {
        return 'incident.resolved';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->incident->id,
            'uuid' => $this->incident->uuid,
            'resolved_at' => $this->incident->resolved_at?->toIso8601String(),
            'time_to_resolve_seconds' => $this->incident->time_to_resolve_seconds,
        ];
    }
}
