<?php

namespace App\Services\Alerts;

use App\Models\AlertChannel;
use App\Models\Incident;
use GuzzleHttp\Client;

class TeamsAlertSender implements AlertSenderInterface
{
    /** Config shape: { "webhook_url": "https://outlook.office.com/webhook/..." } — MS Teams "Incoming Webhook" connector. */
    public function send(AlertChannel $channel, Incident $incident, string $event): void
    {
        $webhookUrl = $channel->config['webhook_url'] ?? null;
        if (! $webhookUrl) {
            throw new \RuntimeException('Teams channel has no webhook URL configured.');
        }

        $message = TemplateParser::parse('teams', $incident, $event);

        $client = new Client(['timeout' => 10]);
        $response = $client->post($webhookUrl, [
            'json' => [
                '@type' => 'MessageCard',
                '@context' => 'http://schema.org/extensions',
                'themeColor' => $event === 'down' ? 'ef4444' : '22c55e',
                'text' => $message,
            ],
            'http_errors' => false,
        ]);

        if ($response->getStatusCode() >= 300) {
            throw new \RuntimeException("Teams webhook returned HTTP {$response->getStatusCode()}.");
        }
    }
}
