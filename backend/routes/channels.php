<?php

use Illuminate\Support\Facades\Broadcast;

/*
| Private channel authorization — a user may only listen on the
| WebSocket channel for THEIR OWN organization's live monitor/incident
| updates (see App\Events\MonitorStatusChanged, IncidentCreated, etc).
*/
Broadcast::channel('org.{organizationId}.monitors', function ($user, $organizationId) {
    return $user->isSuperAdmin() || (int) $user->organization_id === (int) $organizationId;
});

Broadcast::channel('org.{organizationId}.incidents', function ($user, $organizationId) {
    return $user->isSuperAdmin() || (int) $user->organization_id === (int) $organizationId;
});
