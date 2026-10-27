<?php

namespace App\Services\Alerts;

use App\Models\AlertChannel;
use App\Models\Incident;
use App\Models\GlobalSetting;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;
use RuntimeException;

/**
 * Sends WhatsApp alerts using configured Gateway (InfiniChat, Wapblaster, or Custom API).
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
            throw new RuntimeException('WhatsApp channel is missing destination phone number (e.g. 918121886213).');
        }

        if (! $endpointUrl) {
            throw new RuntimeException('WhatsApp API endpoint not configured in Channel config or Super Admin Integrations.');
        }

        $message = TemplateParser::parse('whatsapp', $incident, $event);

        $client = new Client([
            'timeout' => 12,
            'connect_timeout' => 6,
        ]);
        
        $headers = [
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
        ];

        if ($authToken) {
            // Support all common gateway auth header conventions
            $headers['X-API-Key'] = $authToken;
            $headers['x-api-key'] = $authToken;
            $headers['Authorization'] = str_starts_with($authToken, 'Bearer ') ? $authToken : "Bearer {$authToken}";
            $headers['api-key'] = $authToken;
            $headers['token'] = $authToken;
        }

        // Format recipient number (strip non-digits, ensure country code for 10-digit Indian numbers)
        $numericTo = preg_replace('/[^0-9]/', '', (string)$to);
        if (strlen($numericTo) === 10) {
            $numericTo = '91' . $numericTo;
        }

        $payload = [
            'to' => $numericTo,
            'phone' => $numericTo,
            'number' => $numericTo,
            'recipient' => $numericTo,
            'mobile' => $numericTo,
            'message' => $message,
            'text' => $message,
            'type' => 'text',
            'body' => $message,
        ];

        // Candidate endpoints: URL as given, and normalized /messages if user provided base /api/v1
        $candidates = [$endpointUrl];
        $trimmed = rtrim($endpointUrl, '/');
        if (str_ends_with($trimmed, '/api/v1')) {
            $candidates = [$trimmed . '/messages', $trimmed . '/send', $trimmed];
        }

        $lastError = null;

        foreach ($candidates as $url) {
            try {
                $response = $client->post($url, [
                    'headers' => $headers,
                    'json' => $payload,
                    'http_errors' => false,
                ]);

                $status = $response->getStatusCode();
                $body = (string) $response->getBody();

                // If success (2xx)
                if ($status >= 200 && $status < 300) {
                    return;
                }

                // If 404 and we have more candidate endpoints, try the next
                if ($status === 404 && count($candidates) > 1) {
                    $lastError = "HTTP {$status}: " . mb_substr($body, 0, 300);
                    continue;
                }

                // Parse error details
                $json = json_decode($body, true);
                $msg = $json['message'] ?? $json['error'] ?? $body;
                throw new RuntimeException("WhatsApp Gateway returned HTTP {$status}: " . (is_string($msg) ? $msg : json_encode($msg)));
            } catch (RequestException $e) {
                $lastError = $e->getMessage();
            }
        }

        throw new RuntimeException('WhatsApp Gateway delivery failed: ' . ($lastError ?: 'Unknown error'));
    }
}
