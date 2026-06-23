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

        // Temporarily override global settings in memory for the duration of this request
        foreach ($request->all() as $key => $value) {
            \Illuminate\Support\Facades\Config::set("global_settings.{$key}", $value);
        }

        // We use a custom resolver or just update GlobalSetting helper for the test
        // Let's mock GlobalSetting::getValue by setting it in config and changing GlobalSetting.
        
        try {
            $sender = \App\Services\Alerts\AlertSenderFactory::make($provider);
            
            // Create a dummy incident
            $monitor = new \App\Models\Monitor(['name' => 'Test Monitor', 'url' => 'https://example.com']);
            $incident = new \App\Models\Incident(['error_message' => 'This is a test incident.']);
            $incident->setRelation('monitor', $monitor);
            
            $channel = new \App\Models\AlertChannel();
            // Assign dummy 'to' values based on provider type if needed, or pull from request if provided.
            if ($provider === 'email') $channel->config = ['to' => $request->user()->email];
            else if ($provider === 'sms') $channel->config = ['to' => '+1234567890'];
            else if ($provider === 'whatsapp') $channel->config = ['to' => '+1234567890'];
            else if ($provider === 'telegram') $channel->config = ['chat_id' => '123456789'];
            
            // Pass the testing credentials to GlobalSetting cache temporarily
            \App\Models\GlobalSetting::setTestingOverrides($request->all());

            $sender->send($channel, $incident, 'down');

            \App\Models\GlobalSetting::clearTestingOverrides();

            return response()->json(['message' => 'Test alert sent successfully!']);
        } catch (\Exception $e) {
            \App\Models\GlobalSetting::clearTestingOverrides();
            return response()->json(['message' => 'Failed to send test alert: ' . $e->getMessage()], 400);
        }
    }
}
