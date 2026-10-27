<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AlertChannel;
use App\Models\GlobalSetting;
use App\Models\Incident;
use App\Models\Monitor;
use App\Services\Alerts\AlertSenderFactory;
use GuzzleHttp\Client;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Throwable;

class AlertChannelController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $org = $request->attributes->get('organization');

        return response()->json($org->alertChannels()->get());
    }

    public function store(Request $request): JsonResponse
    {
        $org = $request->attributes->get('organization');
        abort_unless($request->user()->isOrgAdmin() || $request->user()->isSuperAdmin(), 403, 'Only Org Admins can manage alert channels.');

        $validator = Validator::make($request->all(), [
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'in:email,sms,whatsapp,telegram,slack,discord,teams,webhook,push,wirepusher'],
            'config' => ['required', 'array'],
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $channel = $org->alertChannels()->create($validator->validated());

        return response()->json($channel, 201);
    }

    public function update(Request $request, AlertChannel $alertChannel): JsonResponse
    {
        $this->authorizeChannel($request, $alertChannel);

        $alertChannel->update($request->only(['name', 'config', 'is_active']));

        return response()->json($alertChannel);
    }

    public function destroy(Request $request, AlertChannel $alertChannel): JsonResponse
    {
        $this->authorizeChannel($request, $alertChannel);
        $alertChannel->delete();

        return response()->json(['message' => 'Alert channel deleted.']);
    }

    /** Sends a test message through the channel without needing a real incident. */
    public function test(Request $request, AlertChannel $alertChannel): JsonResponse
    {
        $this->authorizeChannel($request, $alertChannel);

        try {
            $sender = AlertSenderFactory::make($alertChannel->type);
            $fakeIncident = new Incident([
                'title' => 'Test alert from NetOps Monitor',
                'severity' => 'critical',
                'started_at' => now(),
                'root_cause' => 'Synthetic health probe check: Ping latency exceeded 120ms threshold',
                'error_message' => 'Connection timed out after 5.00 seconds',
            ]);
            $fakeMonitor = new Monitor([
                'name' => 'Primary Edge Gateway (Test)',
                'type' => 'https',
                'target' => 'https://example.com',
                'check_interval_seconds' => 60,
                'config' => [],
            ]);
            $fakeIncident->setRelation('monitor', $fakeMonitor);

            $sender->send($alertChannel, $fakeIncident, 'down');

            return response()->json(['message' => 'Test alert sent successfully.']);
        } catch (Throwable $e) {
            return response()->json(['message' => 'Test alert failed: '.$e->getMessage()], 422);
        }
    }

    /**
     * Retrieve public info about the platform's Telegram Bot (e.g. username).
     */
    public function getTelegramBotInfo(): JsonResponse
    {
        $botToken = GlobalSetting::getValue('telegram_bot_token') ?: config('services.telegram.bot_token');

        if (! $botToken) {
            return response()->json([
                'configured' => false,
                'bot_username' => null,
                'message' => 'Telegram Bot not yet configured by platform Super Admin.',
            ]);
        }

        try {
            $client = new Client(['timeout' => 5]);
            $res = $client->get("https://api.telegram.org/bot{$botToken}/getMe", ['http_errors' => false]);
            $data = json_decode((string) $res->getBody(), true);
            $botUsername = $data['result']['username'] ?? null;

            return response()->json([
                'configured' => true,
                'bot_username' => $botUsername,
            ]);
        } catch (\Throwable) {
            return response()->json([
                'configured' => true,
                'bot_username' => null,
            ]);
        }
    }

    /**
     * Auto-detect chat ID for an organization user from recent Telegram updates.
     */
    public function detectTelegramChat(): JsonResponse
    {
        $botToken = GlobalSetting::getValue('telegram_bot_token') ?: config('services.telegram.bot_token');

        if (! $botToken) {
            return response()->json(['message' => 'Platform Telegram Bot Token is not configured by Super Admin.'], 422);
        }

        try {
            $client = new Client(['timeout' => 8]);

            $meRes = $client->get("https://api.telegram.org/bot{$botToken}/getMe", ['http_errors' => false]);
            $meData = json_decode((string) $meRes->getBody(), true);
            $botUsername = $meData['result']['username'] ?? 'the_bot';

            $upRes = $client->get("https://api.telegram.org/bot{$botToken}/getUpdates", ['http_errors' => false]);
            $upData = json_decode((string) $upRes->getBody(), true);
            $updates = $upData['result'] ?? [];

            if (empty($updates)) {
                return response()->json([
                    'ok' => false,
                    'bot_username' => $botUsername,
                    'message' => "No recent messages found with @{$botUsername}. Open Telegram, search @{$botUsername}, click START or send /start, then click 'Auto-Detect' again.",
                ]);
            }

            $latest = end($updates);
            $chat = $latest['message']['chat'] ?? $latest['channel_post']['chat'] ?? $latest['my_chat_member']['chat'] ?? null;

            if (! $chat || ! isset($chat['id'])) {
                return response()->json([
                    'ok' => false,
                    'bot_username' => $botUsername,
                    'message' => "Could not determine Chat ID from updates. Send a new message to @{$botUsername} and try again.",
                ]);
            }

            $chatId = (string) $chat['id'];
            $name = $chat['title'] ?? trim(($chat['first_name'] ?? '') . ' ' . ($chat['last_name'] ?? '')) ?: ($chat['username'] ?? 'User');

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

    private function authorizeChannel(Request $request, AlertChannel $channel): void
    {
        $user = $request->user();
        if ($user->isSuperAdmin()) {
            return;
        }
        abort_unless($channel->organization_id === $user->organization_id, 403);
        abort_unless($user->isOrgAdmin(), 403, 'Only Org Admins can manage alert channels.');
    }
}
