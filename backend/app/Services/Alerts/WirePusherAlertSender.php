<?php

namespace App\Services\Alerts;

use App\Models\AlertChannel;
use App\Models\Incident;
use GuzzleHttp\Client;

class WirePusherAlertSender implements AlertSenderInterface
{
    /** Config shape: { "device_id": "xxxxx" } */
    public function send(AlertChannel $channel, Incident $incident, string $event): void
    {
        $deviceId = $channel->config['device_id'] ?? null;
        if (! $deviceId) {
            throw new \RuntimeException('WirePusher channel has no device ID configured.');
        }

        $title = mb_substr($incident->title, 0, 100);
        
        $message = '';
        if ($event === 'down') {
            $message = "Monitor is DOWN: " . $incident->monitor?->name;
        } elseif ($event === 'resolved') {
            $message = "Monitor has RECOVERED: " . $incident->monitor?->name;
        } else {
            $message = "Status changed to {$event} for: " . $incident->monitor?->name;
        }

        $client = new Client(['timeout' => 10]);
        $response = $client->get('https://wirepusher.com/send', [
            'query' => [
                'id' => $deviceId,
                'title' => $title,
                'message' => $message,
                'type' => 'NetOps Monitor',
            ],
            'http_errors' => false
        ]);

        if ($response->getStatusCode() >= 300) {
            throw new \RuntimeException("WirePusher returned HTTP {$response->getStatusCode()}.");
        }
    }
}
