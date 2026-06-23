<?php

namespace App\Services\Alerts;

use App\Models\AlertChannel;
use App\Models\Incident;
use App\Models\GlobalSetting;
use GuzzleHttp\Client;

class TelegramAlertSender implements AlertSenderInterface
{
    /** Config shape: { "chat_id": "-100123456789" }. Bot token comes from TELEGRAM_BOT_TOKEN env (shared across the org's bot). */
    public function send(AlertChannel $channel, Incident $incident, string $event): void
    {
        $chatId = $channel->config['chat_id'] ?? null;
        $botToken = GlobalSetting::getValue('telegram_bot_token') ?? config('services.telegram.bot_token');

        if (! $chatId || ! $botToken) {
            throw new \RuntimeException('Telegram channel missing chat_id or bot token not configured.');
        }

        $message = TemplateParser::parse('telegram', $incident, $event);

        $client = new Client(['timeout' => 10]);
        $response = $client->post("https://api.telegram.org/bot{$botToken}/sendMessage", [
            'json' => [
                'chat_id' => $chatId,
                'text' => $message,
                'parse_mode' => 'HTML',
            ],
            'http_errors' => false,
        ]);

        $body = json_decode((string) $response->getBody(), true);
        if (! ($body['ok'] ?? false)) {
            throw new \RuntimeException('Telegram API error: '.($body['description'] ?? 'unknown'));
        }
    }
}
