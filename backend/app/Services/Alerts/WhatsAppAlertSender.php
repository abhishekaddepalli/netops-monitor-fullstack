<?php

namespace App\Services\Alerts;

use App\Models\AlertChannel;
use App\Models\Incident;
use App\Models\GlobalSetting;
use GuzzleHttp\Client;

/**
 * Uses generic 3rd party API (e.g., Wapblaster) for WhatsApp alerts.
 */
class WhatsAppAlertSender implements AlertSenderInterface
{
    /** Config shape: { "to": "+1234567890" } */
    public function send(AlertChannel $channel, Incident $incident, string $event): void
    {
        $to = $channel->config['to'] ?? null;
        $endpointUrl = GlobalSetting::getValue('wapblaster_url');
        $authToken = GlobalSetting::getValue('wapblaster_token');

        if (! $to || ! $endpointUrl) {
            throw new \RuntimeException('WhatsApp channel or API Endpoint not configured in Super Admin.');
        }

        $message = TemplateParser::parse('whatsapp', $incident, $event);

        $client = new Client(['timeout' => 10]);
        
        $headers = [
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
        ];

        if ($authToken) {
            $headers['Authorization'] = "Bearer {$authToken}";
        }

        $response = $client->post($endpointUrl, [
            'headers' => $headers,
            'json' => [
                'to' => $to,
                'message' => $message,
            ],
            'http_errors' => false,
        ]);

        if ($response->getStatusCode() >= 300) {
            throw new \RuntimeException("WhatsApp 3rd Party API returned HTTP {$response->getStatusCode()}: " . (string)$response->getBody());
        }
    }
}
