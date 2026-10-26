<?php

namespace App\Http\Controllers\Api\Admin;

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
        return response()->json(AlertChannel::whereNull('organization_id')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'in:email,sms,whatsapp,telegram,slack,discord,teams,webhook,push,wirepusher'],
            'config' => ['required', 'array'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $channel = AlertChannel::create(array_merge($validator->validated(), [
            'organization_id' => null,
            'is_active' => true,
        ]));

        return response()->json($channel, 201);
    }

    public function update(Request $request, AlertChannel $alertChannel): JsonResponse
    {
        abort_unless(is_null($alertChannel->organization_id), 403, 'Cannot edit organization channels here.');
        $alertChannel->update($request->only(['name', 'config', 'is_active']));
        return response()->json($alertChannel);
    }

    public function destroy(Request $request, AlertChannel $alertChannel): JsonResponse
    {
        abort_unless(is_null($alertChannel->organization_id), 403, 'Cannot delete organization channels here.');
        $alertChannel->delete();
        return response()->json(['message' => 'Alert channel deleted.']);
    }

    public function test(Request $request, AlertChannel $alertChannel): JsonResponse
    {
        abort_unless(is_null($alertChannel->organization_id), 403, 'Cannot test organization channels here.');

        try {
            $sender = AlertSenderFactory::make($alertChannel->type);
            $fakeIncident = new Incident([
                'title' => 'Test alert from NetOps Monitor (Global)',
                'severity' => 'critical',
                'started_at' => now(),
                'root_cause' => 'Synthetic health probe check: Ping latency exceeded 120ms threshold',
            ]);
            $fakeIncident->setRelation('monitor', new Monitor(['name' => 'System Test Monitor', 'type' => 'https', 'target' => 'https://platform.com', 'check_interval_seconds' => 60]));

            $sender->send($alertChannel, $fakeIncident, 'down');

            return response()->json(['message' => 'Test alert sent successfully.']);
        } catch (Throwable $e) {
            return response()->json(['message' => 'Test alert failed: '.$e->getMessage()], 422);
        }
    }
}
