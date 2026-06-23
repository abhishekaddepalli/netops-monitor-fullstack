<?php

namespace App\Services\Alerts;

use App\Models\AlertChannel;
use App\Models\Incident;
use App\Models\GlobalSetting;
use GuzzleHttp\Client;

/**
 * Uses Twilio SMS API.
 */
class SmsAlertSender implements AlertSenderInterface
{
    /** Config shape: { "to": "+1234567890" } */
    public function send(AlertChannel $channel, Incident $incident, string $event): void
    {
        $to = $channel->config['to'] ?? null;
        $sid = GlobalSetting::getValue('twilio_account_sid');
        $token = GlobalSetting::getValue('twilio_auth_token');
        $from = GlobalSetting::getValue('twilio_sms_from');

        if (! $to || ! $sid || ! $token || ! $from) {
            throw new \RuntimeException('SMS channel or Twilio credentials not configured. Please configure in Super Admin Integrations.');
        }

        $message = TemplateParser::parse('sms', $incident, $event);

        $client = new Client(['timeout' => 10]);
        $response = $client->post("https://api.twilio.com/2010-04-01/Accounts/{$sid}/Messages.json", [
            'auth' => [$sid, $token],
            'form_params' => [
                'To' => $to,
                'From' => $from,
                'Body' => $message,
            ],
            'http_errors' => false,
        ]);

        if ($response->getStatusCode() >= 300) {
            throw new \RuntimeException("Twilio SMS API returned HTTP {$response->getStatusCode()}: " . (string)$response->getBody());
        }
    }
}
