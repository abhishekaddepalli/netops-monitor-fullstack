<?php

namespace App\Services\Alerts;

use App\Mail\IncidentAlertMail;
use App\Models\AlertChannel;
use App\Models\Incident;
use App\Services\MailService;
use Illuminate\Support\Facades\Mail;
use RuntimeException;
use Throwable;

class EmailAlertSender implements AlertSenderInterface
{
    /** Config shape: { "to": "ops@company.com" } or { "to": ["a@x.com","b@x.com"] } */
    public function send(AlertChannel $channel, Incident $incident, string $event): void
    {
        $rawRecipients = $channel->config['to'] 
            ?? $channel->config['email'] 
            ?? $channel->config['emails'] 
            ?? [];

        if (is_string($rawRecipients)) {
            $recipients = array_filter(array_map('trim', explode(',', $rawRecipients)));
        } else {
            $recipients = array_filter((array) $rawRecipients);
        }

        if (empty($recipients)) {
            throw new RuntimeException('Email channel has no recipient email addresses configured.');
        }

        // Apply dynamically configured SMTP settings
        MailService::configureSmtp();

        try {
            Mail::to($recipients)->send(new IncidentAlertMail($incident, $event));
        } catch (Throwable $e) {
            throw new RuntimeException('SMTP email delivery failed: ' . $e->getMessage(), 0, $e);
        }
    }
}
