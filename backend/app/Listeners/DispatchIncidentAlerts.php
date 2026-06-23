<?php

namespace App\Listeners;

use App\Events\IncidentCreated;
use App\Events\IncidentResolved;
use App\Services\AlertDispatcher;

class DispatchIncidentAlerts
{
    public function __construct(private AlertDispatcher $dispatcher) {}

    public function handleCreated(IncidentCreated $event): void
    {
        $this->dispatcher->notifyIncidentOpened($event->incident);
    }

    public function handleResolved(IncidentResolved $event): void
    {
        $this->dispatcher->notifyIncidentResolved($event->incident);
    }
}
