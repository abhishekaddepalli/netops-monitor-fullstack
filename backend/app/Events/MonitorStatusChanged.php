<?php

namespace App\Events;

use App\Models\Monitor;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/** Drives the live dashboard / health-strip widget updates over WebSocket. */
class MonitorStatusChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Monitor $monitor, public string $previousStatus) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel("org.{$this->monitor->organization_id}.monitors")];
    }

    public function broadcastAs(): string
    {
        return 'monitor.status_changed';
    }

    public function broadcastWith(): array
    {
        return [
            'monitor_id' => $this->monitor->id,
            'name' => $this->monitor->name,
            'previous_status' => $this->previousStatus,
            'status' => $this->monitor->status,
            'last_response_time_ms' => $this->monitor->last_response_time_ms,
        ];
    }
}
