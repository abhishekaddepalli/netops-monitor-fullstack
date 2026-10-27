<?php

namespace App\Services\Alerts;

use App\Models\AlertChannel;
use App\Models\Incident;
use App\Models\GlobalSetting;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;
use RuntimeException;

class TelegramAlertSender implements AlertSenderInterface
{
    /** Config shape: { "chat_id": "-100123456789", "bot_token": "..." } */
    public function send(AlertChannel $channel, Incident $incident, string $event): void
    {
        $chatId = $channel->config['chat_id'] ?? null;
        $botToken = $channel->config['bot_token'] 
            ?? GlobalSetting::getValue('telegram_bot_token') 
            ?? config('services.telegram.bot_token');

        if (! $chatId) {
            throw new RuntimeException('Telegram channel is missing chat_id or group ID.');
        }

        if (! $botToken) {
            throw new RuntimeException('Telegram Bot Token not configured in Channel config or Super Admin Integrations.');
        }

        $message = TemplateParser::parse('telegram', $incident, $event);

        $client = new Client([
            'timeout' => 10,
            'connect_timeout' => 5,
        ]);

        // Attempt 1: Send with HTML parse_mode
        try {
            $response = $client->post("https://api.telegram.org/bot{$botToken}/sendMessage", [
                'json' => [
                    'chat_id' => $chatId,
                    'text' => $message,
                    'parse_mode' => 'HTML',
                ],
                'http_errors' => false,
            ]);

            $body = json_decode((string) $response->getBody(), true);
            
            // If Telegram rejected due to HTML entity formatting, fallback to plain text
            if (! ($body['ok'] ?? false)) {
                $err = $body['description'] ?? 'unknown error';
                
                // Retry as plain text stripped of HTML tags
                $plainText = strip_tags(str_replace(['<br>', '<br/>', '<br />'], "\n", $message));
                $retryResponse = $client->post("https://api.telegram.org/bot{$botToken}/sendMessage", [
                    'json' => [
                        'chat_id' => $chatId,
                        'text' => $plainText,
                    ],
                    'http_errors' => false,
                ]);

                $retryBody = json_decode((string) $retryResponse->getBody(), true);
                if (! ($retryBody['ok'] ?? false)) {
                    throw new RuntimeException('Telegram API error: ' . ($retryBody['description'] ?? $err));
                }
            }
        } catch (RequestException $e) {
            throw new RuntimeException('Telegram connection error: ' . $e->getMessage());
        }
    }
}
