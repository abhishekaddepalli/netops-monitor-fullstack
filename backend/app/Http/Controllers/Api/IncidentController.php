<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Incident;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class IncidentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $org = $request->attributes->get('organization');

        $query = Incident::query()->where('organization_id', $org->id)->with('monitor:id,name,type,target');

        if ($state = $request->query('state')) {
            $query->where('state', $state);
        } elseif ($request->query('active_only')) {
            $query->whereNot('state', 'resolved');
        }

        $incidents = $query->orderByDesc('started_at')->paginate($request->integer('per_page', 25));

        return response()->json($incidents);
    }

    public function show(Request $request, Incident $incident): JsonResponse
    {
        $this->authorizeOrgAccess($request, $incident);

        return response()->json($incident->load(['monitor', 'updates.postedBy:id,name', 'acknowledgedBy:id,name', 'resolvedBy:id,name']));
    }

    public function acknowledge(Request $request, Incident $incident): JsonResponse
    {
        $this->authorizeOrgAccess($request, $incident, requireOperator: true);

        $validator = Validator::make($request->all(), [
            'root_cause' => ['nullable', 'string', 'max:5000'],
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $incident->acknowledge($request->user(), $request->input('root_cause'));

        return response()->json($incident->fresh());
    }

    public function resolve(Request $request, Incident $incident): JsonResponse
    {
        $this->authorizeOrgAccess($request, $incident, requireOperator: true);

        $validator = Validator::make($request->all(), [
            'resolution_notes' => ['nullable', 'string', 'max:5000'],
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $incident->resolve($request->user(), $request->input('resolution_notes'));

        return response()->json($incident->fresh());
    }

    /** Post a manual update — e.g. moving state to "identified" with a root-cause note. */
    public function addUpdate(Request $request, Incident $incident): JsonResponse
    {
        $this->authorizeOrgAccess($request, $incident, requireOperator: true);

        $validator = Validator::make($request->all(), [
            'state' => ['nullable', 'in:investigating,identified,monitoring,resolved'],
            'message' => ['required', 'string', 'max:5000'],
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $update = $incident->updates()->create([
            'posted_by' => $request->user()->id,
            'state' => $request->input('state'),
            'message' => $request->input('message'),
            'is_system_generated' => false,
        ]);

        if ($request->filled('state')) {
            if ($request->input('state') === 'resolved') {
                $incident->resolve($request->user(), $request->input('message'));
            } else {
                $incident->update(['state' => $request->input('state')]);
            }
        }

        return response()->json($update);
    }

    private function authorizeOrgAccess(Request $request, Incident $incident, bool $requireOperator = false): void
    {
        $user = $request->user();
        if ($user->isSuperAdmin()) {
            return;
        }
        abort_unless($incident->organization_id === $user->organization_id, 403, 'Incident does not belong to your organization.');
        if ($requireOperator) {
            abort_unless($user->isOperatorOrAbove(), 403, 'Read-only users cannot modify incidents.');
        }
    }
}
