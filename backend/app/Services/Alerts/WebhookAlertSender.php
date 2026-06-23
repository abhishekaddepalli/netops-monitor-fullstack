<?php

namespace App\Services\Alerts;

use App\Models\AlertChannel;
use App\Models\Incident;
use GuzzleHttp\Client;

class WebhookAlertSender implements AlertSenderInterface
{
    /** Config shape: { "url": "https://...", "headers": {...}, "secret": "..." } */
    public function send(AlertChannel $channel, Incident $incident, string $event): void
    {
        $url = $channel->config['url'] ?? null;
        if (! $url) {
            throw new \RuntimeException('Webhook channel has no URL configured.');
        }

        $payload = [
            'event' => $event, // 'down' | 'up'
            'incident' => [
                'id' => $incident->uuid,
                'title' => $incident->title,
                'severity' => $incident->severity,
                'state' => $incident->state,
                'started_at' => $incident->started_at->toIso8601String(),
                'resolved_at' => $incident->resolved_at?->toIso8601String(),
            ],
            'monitor' => [
                'id' => $incident->monitor->uuid,
                'name' => $incident->monitor->name,
                'type' => $incident->monitor->type,
                'target' => $incident->monitor->target,
                'status' => $incident->monitor->status,
            ],
        ];

        $headers = $channel->config['headers'] ?? [];
        if (! empty($channel->config['secret'])) {
            $headers['X-NetOps-Signature'] = hash_hmac('sha256', json_encode($payload), $channel->config['secret']);
        }

        $client = new Client(['timeout' => 10]);
        $response = $client->post($url, ['json' => $payload, 'headers' => $headers, 'http_errors' => false]);

        if ($response->getStatusCode() >= 300) {
            throw new \RuntimeException("Webhook endpoint returned HTTP {$response->getStatusCode()}.");
        }
    }
}
