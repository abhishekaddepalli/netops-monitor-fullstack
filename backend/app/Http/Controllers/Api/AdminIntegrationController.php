<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GlobalSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminIntegrationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403);

        $keys = [
            'telegram_bot_token',
            'twilio_account_sid',
            'twilio_auth_token',
            'twilio_sms_from',
            'msg91_auth_key',
            'wapblaster_url',
            'wapblaster_token',
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
            'twilio_account_sid' => 'nullable|string',
            'twilio_auth_token' => 'nullable|string',
            'twilio_sms_from' => 'nullable|string',
            'msg91_auth_key' => 'nullable|string',
            'wapblaster_url' => 'nullable|url',
            'wapblaster_token' => 'nullable|string',
            'radius_api_key' => 'nullable|string',
            'smtp_host' => 'nullable|string',
            'smtp_port' => 'nullable|string',
            'smtp_username' => 'nullable|string',
            'smtp_password' => 'nullable|string',
            'smtp_encryption' => 'nullable|string',
            'smtp_from_address' => 'nullable|email',
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

        return response()->json(['message' => 'Integrations updated successfully']);
    }

    public function test(Request $request, string $provider): JsonResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403);

        // Temporarily override global settings in memory for the duration of this test
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

            // Assign destination based on request inputs or defaults
            if ($provider === 'email') {
                $channel->config = ['to' => $request->input('test_email', $request->user()->email)];
            } elseif ($provider === 'sms') {
                $channel->config = ['to' => $request->input('test_phone', '+1234567890')];
            } elseif ($provider === 'whatsapp') {
                $channel->config = [
                    'to' => $request->input('test_whatsapp_to', $request->input('wapblaster_test_to', '+1234567890')),
                    'endpoint_url' => $request->input('wapblaster_url'),
                    'token' => $request->input('wapblaster_token'),
                ];
            } elseif ($provider === 'telegram') {
                $channel->config = [
                    'chat_id' => $request->input('test_chat_id', '123456789'),
                    'bot_token' => $request->input('telegram_bot_token'),
                ];
            } elseif ($provider === 'wirepusher') {
                $channel->config = ['device_id' => $request->input('test_device_id', 'demo')];
            }
            
            \App\Models\GlobalSetting::setTestingOverrides($request->all());

            $sender->send($channel, $incident, 'down');

            \App\Models\GlobalSetting::clearTestingOverrides();

            return response()->json(['message' => 'Test alert sent successfully! Check your device or inbox.']);
        } catch (\Throwable $e) {
            \App\Models\GlobalSetting::clearTestingOverrides();
            return response()->json(['message' => 'Failed to send test alert: ' . $e->getMessage()], 422);
        }
    }
}
