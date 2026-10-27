<?php

namespace App\Services\Alerts;

use App\Models\AlertChannel;
use App\Models\Incident;
use GuzzleHttp\Client;
use RuntimeException;

class WirePusherAlertSender implements AlertSenderInterface
{
    /** Config shape: { "device_id": "xxxxx" } */
    public function send(AlertChannel $channel, Incident $incident, string $event): void
    {
        $deviceId = $channel->config['device_id'] ?? $channel->config['id'] ?? null;
        if (! $deviceId) {
            throw new RuntimeException('WirePusher channel has no device ID configured.');
        }

        $monitor = $incident->monitor;
        $monitorName = $monitor?->name ?? 'Monitor';
        $isDown = ($event === 'down');

        $title = $isDown ? "🚨 DOWN: {$monitorName}" : "✅ UP: {$monitorName}";
        
        $parsed = TemplateParser::parse('wirepusher', $incident, $event);
        $message = !empty($parsed) ? $parsed : ($isDown ? "{$monitorName} is currently DOWN: {$incident->title}" : "{$monitorName} has recovered and is UP.");

        $client = new Client(['timeout' => 8, 'connect_timeout' => 4]);
        $response = $client->get('https://wirepusher.com/send', [
            'query' => [
                'id' => $deviceId,
                'title' => mb_substr($title, 0, 100),
                'message' => mb_substr($message, 0, 500),
                'type' => $isDown ? 'alert' : 'recovery',
            ],
            'http_errors' => false
        ]);

        if ($response->getStatusCode() >= 300) {
            throw new RuntimeException("WirePusher returned HTTP {$response->getStatusCode()}: " . (string)$response->getBody());
        }
    }
}
