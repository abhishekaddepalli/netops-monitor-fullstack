<?php

namespace App\Services\Alerts;

use App\Models\AlertChannel;
use App\Models\Incident;
use GuzzleHttp\Client;

class DiscordAlertSender implements AlertSenderInterface
{
    /** Config shape: { "webhook_url": "https://discord.com/api/webhooks/..." } */
    public function send(AlertChannel $channel, Incident $incident, string $event): void
    {
        $webhookUrl = $channel->config['webhook_url'] ?? null;
        if (! $webhookUrl) {
            throw new \RuntimeException('Discord channel has no webhook URL configured.');
        }

        $message = TemplateParser::parse('discord', $incident, $event);

        $client = new Client(['timeout' => 10]);
        $response = $client->post($webhookUrl, [
            'json' => ['content' => $message],
            'http_errors' => false,
        ]);

        if ($response->getStatusCode() >= 300) {
            throw new \RuntimeException("Discord webhook returned HTTP {$response->getStatusCode()}.");
        }
    }
}
