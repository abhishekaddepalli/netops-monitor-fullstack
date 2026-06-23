<?php

namespace App\Services\Alerts;

use App\Models\AlertChannel;
use App\Models\Incident;

interface AlertSenderInterface
{
    /**
     * Send the alert. Must throw on failure (caught by SendAlertJob, which
     * logs to alert_logs with status=failed) — do not silently swallow errors.
     */
    public function send(AlertChannel $channel, Incident $incident, string $event): void;
}
