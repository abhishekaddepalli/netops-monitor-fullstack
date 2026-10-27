<?php

namespace App\Listeners;

use App\Events\IncidentCreated;
use App\Events\IncidentResolved;
use App\Models\AlertLog;
use App\Services\AlertDispatcher;

class DispatchIncidentAlerts
{
    public function __construct(private AlertDispatcher $dispatcher) {}

    public function handleCreated(IncidentCreated $event): void
    {
        // Prevent duplicate alerts if IncidentManager already dispatched immediately
        $alreadySent = AlertLog::where('incident_id', $event->incident->id)
            ->where('event', 'down')
            ->where('created_at', '>=', now()->subSeconds(30))
            ->exists();

        if (! $alreadySent) {
            $this->dispatcher->notifyIncidentOpened($event->incident);
        }
    }

    public function handleResolved(IncidentResolved $event): void
    {
        $alreadySent = AlertLog::where('incident_id', $event->incident->id)
            ->where('event', 'up')
            ->where('created_at', '>=', now()->subSeconds(30))
            ->exists();

        if (! $alreadySent) {
            $this->dispatcher->notifyIncidentResolved($event->incident);
        }
    }
}
