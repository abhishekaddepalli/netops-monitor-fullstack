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
        $chatId = $channel->config['chat_id'] 
            ?? $channel->config['to']
            ?? GlobalSetting::getValue('telegram_test_chat_id')
            ?? null;

        $botToken = $channel->config['bot_token'] 
            ?? GlobalSetting::getValue('telegram_bot_token') 
            ?? config('services.telegram.bot_token');

        if (! $chatId) {
            throw new RuntimeException('Telegram channel is missing Chat ID. Please enter your Chat ID or click Auto-Detect.');
        }

        if (! $botToken) {
            throw new RuntimeException('Telegram Bot Token not configured in Super Admin Alert Integrations.');
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
            
            // If Telegram rejected, retry with plain text (in case HTML entity tags caused it)
            if (! ($body['ok'] ?? false)) {
                $err = $body['description'] ?? 'unknown error';
                
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
                    $errDesc = $retryBody['description'] ?? $err;
                    if (str_contains(strtolower($errDesc), 'chat not found')) {
                        throw new RuntimeException("Telegram Chat '{$chatId}' not found. Please open our bot in Telegram, tap START, and use your numeric Chat ID (click 'Auto-Detect My Chat ID' in channel settings).");
                    }
                    throw new RuntimeException('Telegram API error: ' . $errDesc);
                }
            }
        } catch (RequestException $e) {
            throw new RuntimeException('Telegram connection error: ' . $e->getMessage());
        }
    }
}
