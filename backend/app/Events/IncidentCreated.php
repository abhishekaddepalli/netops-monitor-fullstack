<?php

namespace App\Events;

use App\Models\Incident;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class IncidentCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Incident $incident) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel("org.{$this->incident->organization_id}.incidents")];
    }

    public function broadcastAs(): string
    {
        return 'incident.created';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->incident->id,
            'uuid' => $this->incident->uuid,
            'title' => $this->incident->title,
            'severity' => $this->incident->severity,
            'monitor_id' => $this->incident->monitor_id,
            'started_at' => $this->incident->started_at->toIso8601String(),
        ];
    }
}
