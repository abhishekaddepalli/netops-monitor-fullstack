<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GlobalSetting;
use App\Models\Organization;
use App\Services\MailService;
use GuzzleHttp\Client;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminIntegrationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403);

        $keys = [
            'telegram_bot_token',
            'telegram_test_chat_id',
            'twilio_account_sid',
            'twilio_auth_token',
            'twilio_sms_from',
            'msg91_auth_key',
            'wapblaster_url',
            'wapblaster_token',
            'whatsapp_test_phone',
            'radius_api_key',
            'smtp_host',
            'smtp_port',
            'smtp_username',
            'smtp_password',
            'smtp_encryption',
            'smtp_from_address',
            'pusher_app_id',
            'pusher_app_key',
            'pusher_app_secret',
            'pusher_app_cluster',
        ];

        $settings = GlobalSetting::whereIn('key', $keys)->pluck('value', 'key');

        return response()->json($settings);
    }

    public function update(Request $request): JsonResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403);

        $data = $request->validate([
            'telegram_bot_token' => 'nullable|string',
            'telegram_test_chat_id' => 'nullable|string',
            'twilio_account_sid' => 'nullable|string',
            'twilio_auth_token' => 'nullable|string',
            'twilio_sms_from' => 'nullable|string',
            'msg91_auth_key' => 'nullable|string',
            'wapblaster_url' => 'nullable|string',
            'wapblaster_token' => 'nullable|string',
            'whatsapp_test_phone' => 'nullable|string',
            'radius_api_key' => 'nullable|string',
            'smtp_host' => 'nullable|string',
            'smtp_port' => 'nullable|string',
            'smtp_username' => 'nullable|string',
            'smtp_password' => 'nullable|string',
            'smtp_encryption' => 'nullable|string',
            'smtp_from_address' => 'nullable|string',
            'pusher_app_id' => 'nullable|string',
            'pusher_app_key' => 'nullable|string',
            'pusher_app_secret' => 'nullable|string',
            'pusher_app_cluster' => 'nullable|string',
        ]);

        foreach ($data as $key => $value) {
            GlobalSetting::updateOrCreate(
                ['key' => $key],
                ['value' => $value]
            );
        }

        // Trigger dynamic SMTP cache reload
        MailService::configureSmtp();

        return response()->json(['message' => 'Integrations updated successfully']);
    }

    /**
     * Auto-detect chat ID from recent messages sent to the Telegram bot.
     */
    public function detectTelegramChat(Request $request): JsonResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403);

        $botToken = $request->input('telegram_bot_token') 
            ?: GlobalSetting::getValue('telegram_bot_token');

        if (! $botToken) {
            return response()->json(['message' => 'Please enter and save your Telegram Bot Token first.'], 422);
        }

        try {
            $client = new Client(['timeout' => 8]);

            // 1. Verify Bot Token and retrieve bot username
            $meRes = $client->get("https://api.telegram.org/bot{$botToken}/getMe", ['http_errors' => false]);
            $meData = json_decode((string) $meRes->getBody(), true);
            if (! ($meData['ok'] ?? false)) {
                return response()->json([
                    'message' => 'Invalid Telegram Bot Token: ' . ($meData['description'] ?? 'Unauthorized')
                ], 422);
            }
            $botUsername = $meData['result']['username'] ?? 'your_bot';

            // 2. Fetch recent incoming updates
            $upRes = $client->get("https://api.telegram.org/bot{$botToken}/getUpdates", ['http_errors' => false]);
            $upData = json_decode((string) $upRes->getBody(), true);
            $updates = $upData['result'] ?? [];

            if (empty($updates)) {
                return response()->json([
                    'ok' => false,
                    'bot_username' => $botUsername,
                    'message' => "Bot verified (@{$botUsername})! But no conversations found yet. Open Telegram, search @{$botUsername}, click START or send /start, then click 'Auto-Detect Chat ID' again.",
                ]);
            }

            // Find the most recent update with chat info
            $latest = end($updates);
            $chat = $latest['message']['chat'] ?? $latest['channel_post']['chat'] ?? $latest['my_chat_member']['chat'] ?? null;

            if (! $chat || ! isset($chat['id'])) {
                return response()->json([
                    'ok' => false,
                    'bot_username' => $botUsername,
                    'message' => "Found updates from @{$botUsername}, but could not resolve chat ID. Send a new message to the bot and try again.",
                ]);
            }

            $chatId = (string) $chat['id'];
            $name = $chat['title'] ?? trim(($chat['first_name'] ?? '') . ' ' . ($chat['last_name'] ?? '')) ?: ($chat['username'] ?? 'User');

            // Persist the detected chat ID
            GlobalSetting::updateOrCreate(['key' => 'telegram_test_chat_id'], ['value' => $chatId]);

            return response()->json([
                'ok' => true,
                'chat_id' => $chatId,
                'chat_name' => $name,
                'bot_username' => $botUsername,
                'message' => "Detected active chat with '{$name}' (Chat ID: {$chatId})!",
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Telegram connection failed: ' . $e->getMessage()], 422);
        }
    }

    /**
     * Send a test alert for any supported integration provider.
     */
    public function test(Request $request, string $provider): JsonResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403);

        // Apply in-memory overrides for testing
        foreach ($request->all() as $key => $value) {
            \Illuminate\Support\Facades\Config::set("global_settings.{$key}", $value);
        }

        try {
            $sender = \App\Services\Alerts\AlertSenderFactory::make($provider);
            
            // Create a realistic test incident & monitor
            $monitor = new \App\Models\Monitor([
                'name' => 'Demo Edge Server (Test Probe)',
                'target' => 'https://example.com',
                'type' => 'http',
                'check_interval_seconds' => 60,
                'confirmation_failures' => 3,
            ]);
            $incident = new \App\Models\Incident([
                'title' => 'Test Probe: High Latency Detected',
                'severity' => 'critical',
                'started_at' => now(),
                'root_cause' => 'Manual test alert dispatched from Super Admin Integrations Panel',
            ]);
            $incident->setRelation('monitor', $monitor);
            
            $channel = new \App\Models\AlertChannel();
            $channel->type = $provider;
            $channel->is_active = true;

            if ($provider === 'email') {
                $testEmail = $request->input('test_email') 
                    ?: $request->input('smtp_test_email') 
                    ?: $request->user()->email;
                $channel->config = ['to' => $testEmail];
                MailService::configureSmtp();
            } elseif ($provider === 'sms') {
                $channel->config = ['to' => $request->input('test_phone', '+918121886213')];
            } elseif ($provider === 'whatsapp') {
                $toPhone = $request->input('test_whatsapp_to')
                    ?: $request->input('whatsapp_test_phone')
                    ?: $request->input('wapblaster_test_to')
                    ?: GlobalSetting::getValue('whatsapp_test_phone')
                    ?: '918121886213';

                $channel->config = [
                    'to' => $toPhone,
                    'endpoint_url' => $request->input('wapblaster_url') ?: GlobalSetting::getValue('wapblaster_url'),
                    'token' => $request->input('wapblaster_token') ?: GlobalSetting::getValue('wapblaster_token'),
                ];
            } elseif ($provider === 'telegram') {
                $botToken = $request->input('telegram_bot_token') 
                    ?: GlobalSetting::getValue('telegram_bot_token');

                $chatId = $request->input('test_chat_id') 
                    ?: $request->input('telegram_test_chat_id')
                    ?: GlobalSetting::getValue('telegram_test_chat_id');

                // If chat ID not specified, attempt auto-detection from recent updates
                if (! $chatId && $botToken) {
                    try {
                        $client = new Client(['timeout' => 5]);
                        $upRes = $client->get("https://api.telegram.org/bot{$botToken}/getUpdates", ['http_errors' => false]);
                        $upData = json_decode((string) $upRes->getBody(), true);
                        if (!empty($upData['result'])) {
                            $lastUpdate = end($upData['result']);
                            $chatId = $lastUpdate['message']['chat']['id'] 
                                ?? $lastUpdate['channel_post']['chat']['id'] 
                                ?? null;
                            if ($chatId) {
                                GlobalSetting::updateOrCreate(['key' => 'telegram_test_chat_id'], ['value' => (string) $chatId]);
                            }
                        }
                    } catch (\Throwable) {}
                }

                if (! $chatId) {
                    throw new \RuntimeException("No Telegram Chat ID found! Please click 'Auto-Detect Chat ID' or enter your numeric Chat ID (or group @username). If this is a new bot, open it in Telegram and click START first.");
                }

                $channel->config = [
                    'chat_id' => $chatId,
                    'bot_token' => $botToken,
                ];
            } elseif ($provider === 'wirepusher') {
                $channel->config = ['device_id' => $request->input('test_device_id', 'demo')];
            }
            
            GlobalSetting::setTestingOverrides($request->all());

            $sender->send($channel, $incident, 'down');

            GlobalSetting::clearTestingOverrides();

            return response()->json(['message' => "Test alert sent successfully via {$provider}! Check your inbox/app."]);
        } catch (\Throwable $e) {
            GlobalSetting::clearTestingOverrides();
            return response()->json(['message' => 'Failed to send test alert: ' . $e->getMessage()], 422);
        }
    }

    /**
     * Send test monthly SLA report via email.
     */
    public function testMonthlyReport(Request $request): JsonResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403);

        $testEmail = $request->input('test_email') 
            ?: $request->input('smtp_test_email') 
            ?: $request->user()->email;

        $org = $request->user()->organization ?: Organization::first();
        if (! $org) {
            return response()->json(['message' => 'No active organization found to generate report for.'], 422);
        }

        try {
            $result = MailService::sendPeriodicReport($org, 'monthly', $testEmail);
            return response()->json([
                'message' => "Monthly SLA performance report generated and dispatched to {$testEmail}!",
                'details' => $result
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Failed to send monthly report: ' . $e->getMessage()], 422);
        }
    }
}
