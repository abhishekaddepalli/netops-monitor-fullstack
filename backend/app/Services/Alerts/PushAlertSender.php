<?php

namespace App\Services\Alerts;

use App\Models\AlertChannel;
use App\Models\Incident;

/**
 * Web/mobile push depends on a registered FCM/APNs device token store that
 * doesn't exist in this pass (no mobile app push-token table yet — see
 * Additional Advanced Features: "Mobile responsive UI" / agent apps).
 * Wire this up once device_tokens table + FCM server key exist:
 *   1. Add a device_tokens table (user_id, token, platform)
 *   2. POST to FCM's HTTP v1 API with channel's target user's tokens
 * Left as an explicit no-op (not silently "successful") so misconfigured
 * push channels surface clearly in alert_logs as failed, not lost silently.
 */
class PushAlertSender implements AlertSenderInterface
{
    public function send(AlertChannel $channel, Incident $incident, string $event): void
    {
        throw new \RuntimeException('Push notifications are not yet implemented — see class docblock for the wiring steps.');
    }
}
