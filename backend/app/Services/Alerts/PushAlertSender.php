<?php

namespace App\Services\Alerts;

use App\Models\AlertChannel;
use App\Models\Incident;
use GuzzleHttp\Client;
use RuntimeException;

class PushAlertSender implements AlertSenderInterface
{
    /** Config shape: { "endpoint": "https://...", "key": "..." } or FCM webhook */
    public function send(AlertChannel $channel, Incident $incident, string $event): void
    {
        $endpoint = $channel->config['endpoint'] 
            ?? $channel->config['webhook_url'] 
            ?? $channel->config['url'] 
            ?? null;

        $title = ($event === 'down') 
            ? "🚨 Monitor DOWN: {$incident->monitor?->name}" 
            : "✅ Monitor UP: {$incident->monitor?->name}";

        $body = TemplateParser::parse('push', $incident, $event);

        if ($endpoint) {
            $client = new Client(['timeout' => 8, 'connect_timeout' => 4]);
            $client->post($endpoint, [
                'json' => [
                    'title' => $title,
                    'body' => $body,
                    'incident_id' => $incident->id,
                    'event' => $event,
                ],
                'http_errors' => false,
            ]);
            return;
        }

        // If no external push endpoint configured on channel, broadcast via Pusher/event
        try {
            event(new \App\Events\MonitorStatusChanged($incident->monitor, $event === 'down' ? 'up' : 'down'));
        } catch (\Throwable) {
            // Silently continue
        }
    }
}
