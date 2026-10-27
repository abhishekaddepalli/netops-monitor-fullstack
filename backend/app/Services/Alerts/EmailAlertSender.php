<?php

namespace App\Services\Alerts;

use App\Mail\IncidentAlertMail;
use App\Models\AlertChannel;
use App\Models\GlobalSetting;
use App\Models\Incident;
use Illuminate\Support\Facades\Config;
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

        // Apply dynamically configured SMTP settings if present
        $this->ensureSmtpConfig();

        try {
            Mail::to($recipients)->send(new IncidentAlertMail($incident, $event));
        } catch (Throwable $e) {
            throw new RuntimeException('SMTP email delivery failed: ' . $e->getMessage());
        }
    }

    private function ensureSmtpConfig(): void
    {
        try {
            $host = GlobalSetting::getValue('smtp_host');
            if ($host) {
                Config::set('mail.mailers.smtp.host', $host);
                Config::set('mail.mailers.smtp.port', GlobalSetting::getValue('smtp_port', 587));
                Config::set('mail.mailers.smtp.username', GlobalSetting::getValue('smtp_username'));
                Config::set('mail.mailers.smtp.password', GlobalSetting::getValue('smtp_password'));
                Config::set('mail.mailers.smtp.encryption', GlobalSetting::getValue('smtp_encryption', 'tls'));
                
                $fromAddress = GlobalSetting::getValue('smtp_from_address');
                if ($fromAddress) {
                    Config::set('mail.from.address', $fromAddress);
                    Config::set('mail.from.name', 'NetOps Monitor');
                }

                Mail::purge('smtp');
            }
        } catch (Throwable) {
            // Proceed with env settings if GlobalSetting table lookup fails
        }
    }
}
