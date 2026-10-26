<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Incident;
use App\Models\Monitor;
use App\Models\StatusPage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class StatusPageController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $org = $request->attributes->get('organization');

        return response()->json($org->statusPages()->withCount('components')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $org = $request->attributes->get('organization');

        $plan = \App\Models\Plan::where('key', $org->plan)->first();
        $limit = $plan ? (int)$plan->status_page_limit : 1;
        if ($limit !== -1 && $org->statusPages()->count() >= $limit) {
            return response()->json(['message' => "Status page limit reached for your plan ({$limit}). Please upgrade."], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => ['required', 'string', 'max:255'],
            'custom_domain' => ['nullable', 'string', 'max:255', 'unique:status_pages,custom_domain'],
            'primary_color' => ['nullable', 'string', 'max:7'],
            'component_monitor_ids' => ['nullable', 'array'],
            'component_monitor_ids.*' => ['exists:monitors,id'],
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $page = $org->statusPages()->create($request->only(['name', 'custom_domain', 'primary_color', 'support_url']));

        foreach ($request->input('component_monitor_ids', []) as $i => $monitorId) {
            $monitor = Monitor::find($monitorId);
            $page->components()->create([
                'monitor_id' => $monitorId,
                'name' => $monitor->name ?? 'Component',
                'sort_order' => $i,
            ]);
        }

        return response()->json($page->load('components'), 201);
    }

    public function update(Request $request, StatusPage $statusPage): JsonResponse
    {
        $this->authorizeOrgAccess($request, $statusPage);

        $statusPage->update($request->only([
            'name', 'primary_color', 'support_url', 'show_uptime_history',
            'uptime_history_days', 'is_published',
        ]));

        if ($request->filled('password')) {
            $statusPage->update([
                'is_password_protected' => true,
                'password_hash' => Hash::make($request->input('password')),
            ]);
        }

        return response()->json($statusPage);
    }

    public function destroy(Request $request, StatusPage $statusPage): JsonResponse
    {
        $this->authorizeOrgAccess($request, $statusPage, requireAdmin: true);
        $statusPage->delete();

        return response()->json(['message' => 'Status page deleted.']);
    }

    /**
     * PUBLIC endpoint — no auth, no organization scoping check beyond the
     * page being published. This is what status.company.com renders from.
     */
    public function publicShow(Request $request, string $slug): JsonResponse
    {
        try {
            $page = StatusPage::where(function ($query) use ($slug) {
                    $query->where('slug', $slug)->orWhere('custom_domain', $slug);
                })
                ->where('is_published', true)
                ->with(['components.monitor', 'maintenanceWindows' => fn ($q) => $q->where('ends_at', '>=', now())])
                ->firstOrFail();

            if ($page->is_password_protected) {
                $providedPassword = $request->header('X-Status-Page-Password');
                if (! $providedPassword || ! Hash::check($providedPassword, $page->password_hash)) {
                    return response()->json(['message' => 'Password required.', 'password_protected' => true], 401);
                }
            }

            $recentIncidents = Incident::whereIn('monitor_id', $page->components->pluck('monitor_id'))
                ->where('show_on_status_page', true)
                ->orderByDesc('started_at')
                ->limit(10)
                ->with('updates')
                ->get();

            return response()->json([
                'name' => $page->name,
                'logo_path' => $page->logo_path,
                'primary_color' => $page->primary_color,
                'overall_status' => $page->overallStatus(),
                'components' => $page->components->map(fn ($c) => [
                    'name' => $c->name,
                    'status' => $c->monitor->status ?? 'pending',
                    'group' => $c->group_name,
                    'response_time_ms' => $c->monitor->last_response_time_ms ?? null,
                    'last_checked_at' => $c->monitor->last_checked_at ?? null,
                    'type' => $c->monitor->type ?? null,
                ]),
                'active_maintenance' => $page->maintenanceWindows,
                'recent_incidents' => $recentIncidents,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error loading status page',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ], 500);
        }
    }

    private function authorizeOrgAccess(Request $request, StatusPage $page, bool $requireAdmin = false): void
    {
        $user = $request->user();
        if ($user->isSuperAdmin()) {
            return;
        }
        abort_unless($page->organization_id === $user->organization_id, 403);
        if ($requireAdmin) {
            abort_unless($user->isOrgAdmin(), 403, 'Only Org Admins can perform this action.');
        }
    }
}
