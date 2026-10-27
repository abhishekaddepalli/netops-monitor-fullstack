<?php

namespace App\Services\Alerts;

use App\Models\AlertChannel;
use App\Models\Incident;
use App\Models\GlobalSetting;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;
use RuntimeException;

/**
 * Sends WhatsApp alerts using configured Gateway (Wapblaster, Custom API, or Webhook).
 */
class WhatsAppAlertSender implements AlertSenderInterface
{
    /** Config shape: { "to": "+1234567890", "endpoint_url": "...", "token": "..." } */
    public function send(AlertChannel $channel, Incident $incident, string $event): void
    {
        $to = $channel->config['to'] 
            ?? $channel->config['phone'] 
            ?? $channel->config['phone_number'] 
            ?? null;

        $endpointUrl = $channel->config['endpoint_url'] 
            ?? $channel->config['url'] 
            ?? GlobalSetting::getValue('wapblaster_url');

        $authToken = $channel->config['token'] 
            ?? $channel->config['api_key'] 
            ?? GlobalSetting::getValue('wapblaster_token');

        if (! $to) {
            throw new RuntimeException('WhatsApp channel is missing destination phone number (e.g. +91XXXXXXXXXX).');
        }

        if (! $endpointUrl) {
            throw new RuntimeException('WhatsApp API endpoint not configured in Channel config or Super Admin Integrations.');
        }

        $message = TemplateParser::parse('whatsapp', $incident, $event);

        $client = new Client([
            'timeout' => 10,
            'connect_timeout' => 5,
        ]);
        
        $headers = [
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
        ];

        if ($authToken) {
            $headers['Authorization'] = str_starts_with($authToken, 'Bearer ') ? $authToken : "Bearer {$authToken}";
            $headers['api-key'] = $authToken;
        }

        // Clean recipient number
        $cleanTo = preg_replace('/[^0-9+]/', '', (string)$to);

        $payload = [
            'to' => $cleanTo,
            'phone' => $cleanTo,
            'number' => $cleanTo,
            'message' => $message,
            'text' => $message,
        ];

        try {
            $response = $client->post($endpointUrl, [
                'headers' => $headers,
                'json' => $payload,
                'http_errors' => false,
            ]);

            $status = $response->getStatusCode();
            if ($status >= 300) {
                $body = (string)$response->getBody();
                throw new RuntimeException("WhatsApp Gateway returned HTTP {$status}: " . mb_substr($body, 0, 300));
            }
        } catch (RequestException $e) {
            throw new RuntimeException('WhatsApp Gateway connection failed: ' . $e->getMessage());
        }
    }
}
