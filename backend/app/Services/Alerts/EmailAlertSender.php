<?php

namespace App\Services\Alerts;

use App\Mail\IncidentAlertMail;
use App\Models\AlertChannel;
use App\Models\Incident;
use Illuminate\Support\Facades\Mail;

class EmailAlertSender implements AlertSenderInterface
{
    /** Config shape: { "to": "ops@company.com" } or { "to": ["a@x.com","b@x.com"] } */
    public function send(AlertChannel $channel, Incident $incident, string $event): void
    {
        $recipients = (array) ($channel->config['to'] ?? []);

        if (empty($recipients)) {
            throw new \RuntimeException('Email channel has no recipients configured.');
        }

        Mail::to($recipients)->send(new IncidentAlertMail($incident, $event));
    }
}
