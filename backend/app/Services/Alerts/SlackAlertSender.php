<?php

namespace App\Services\Alerts;

use App\Models\AlertChannel;
use App\Models\Incident;
use GuzzleHttp\Client;

class SlackAlertSender implements AlertSenderInterface
{
    /** Config shape: { "webhook_url": "https://hooks.slack.com/services/..." } */
    public function send(AlertChannel $channel, Incident $incident, string $event): void
    {
        $webhookUrl = $channel->config['webhook_url'] ?? null;
        if (! $webhookUrl) {
            throw new \RuntimeException('Slack channel has no webhook URL configured.');
        }

            ]],
        ];

        $client = new Client(['timeout' => 10]);
        $response = $client->post($webhookUrl, ['json' => $payload, 'http_errors' => false]);

        if ($response->getStatusCode() >= 300) {
            throw new \RuntimeException("Slack webhook returned HTTP {$response->getStatusCode()}.");
        }
    }
}
