<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AlertChannel;
use App\Models\Incident;
use App\Models\Monitor;
use App\Services\Alerts\AlertSenderFactory;
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
