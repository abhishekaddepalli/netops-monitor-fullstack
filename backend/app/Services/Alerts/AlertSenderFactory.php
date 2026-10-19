<?php

namespace App\Services\Alerts;

use InvalidArgumentException;

class AlertSenderFactory
{
    private const MAP = [
        'email' => EmailAlertSender::class,
        'webhook' => WebhookAlertSender::class,
        'slack' => SlackAlertSender::class,
        'telegram' => TelegramAlertSender::class,
        'discord' => DiscordAlertSender::class,
        'teams' => TeamsAlertSender::class,
        'whatsapp' => WhatsAppAlertSender::class,
        'sms' => SmsAlertSender::class,
        'push' => PushAlertSender::class,
        'wirepusher' => WirePusherAlertSender::class,
    ];

    public static function make(string $type): AlertSenderInterface
    {
        $class = self::MAP[$type] ?? null;

        if (! $class) {
            throw new InvalidArgumentException("No alert sender implemented for channel type [{$type}].");
        }

        return app($class);
    }
}
