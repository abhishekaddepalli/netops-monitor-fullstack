<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GlobalSetting;
use App\Models\Monitor;
use App\Models\Organization;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\User;
use App\Services\MailService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class RadiusIntegrationController extends Controller
{
    /**
     * Resolve an organization by ID, slug, or custom radius_username.
     */
    private function resolveOrganization($idOrIdentifier): Organization
    {
        $org = null;
        if (is_numeric($idOrIdentifier)) {
            $org = Organization::find($idOrIdentifier);
        }

        if (! $org) {
            $org = Organization::where('slug', $idOrIdentifier)
                ->orWhere('custom_features->radius_username', (string) $idOrIdentifier)
                ->orWhere('custom_features->external_id', (string) $idOrIdentifier)
                ->first();
        }

        if (! $org) {
            abort(404, "Organization with identifier '{$idOrIdentifier}' not found.");
        }

        return $org;
    }

    /**
     * Check if a specific Radius API action is allowed by Super Admin toggles.
     */
    private function checkPermission(string $featureKey, string $actionName): void
    {
        $val = GlobalSetting::getValue($featureKey, '1');
        if ($val === '0' || $val === false) {
            abort(403, "Action '{$actionName}' is disabled in Radius Integration Settings by the platform Super Admin.");
        }
    }

    /**
     * Provision a new tenant Organization, Admin User, and Plan Subscription via Radius.
     */
    public function provision(Request $request): JsonResponse
    {
        $this->checkPermission('radius_allow_provision', 'Provision Organization');

        $validated = $request->validate([
            'org_name' => 'required|string|max:255',
            'admin_email' => 'required|email|unique:users,email',
            'admin_name' => 'nullable|string|max:255',
            'admin_password' => 'nullable|string|min:6',
            'plan_id' => 'nullable',
            'plan_key' => 'nullable|string',
            'radius_username' => 'nullable|string|max:255',
            'external_id' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:255',
            'monitor_limit' => 'nullable|integer|min:1',
        ]);

        // Resolve plan
        $plan = null;
        if (! empty($validated['plan_id'])) {
            $plan = Plan::find($validated['plan_id']);
        }
        if (! $plan && ! empty($validated['plan_key'])) {
            $plan = Plan::where('key', $validated['plan_key'])->first();
        }
        if (! $plan) {
            $defaultPlanId = GlobalSetting::getValue('radius_default_plan_id');
            if ($defaultPlanId) {
                $plan = Plan::find($defaultPlanId);
            }
        }
        if (! $plan) {
            $plan = Plan::where('is_active', true)->orderBy('price')->first();
        }

        $password = $validated['admin_password'] ?? Str::random(12);
        $adminName = $validated['admin_name'] ?: ($validated['org_name'] . ' Admin');

        DB::beginTransaction();
        try {
            $customFeatures = [];
            if (! empty($validated['radius_username'])) {
                $customFeatures['radius_username'] = $validated['radius_username'];
            }
            if (! empty($validated['external_id'])) {
                $customFeatures['external_id'] = $validated['external_id'];
            }
            $customFeatures['provisioned_via'] = 'radius_api';

            $organization = Organization::create([
                'name' => $validated['org_name'],
                'slug' => Str::slug($validated['org_name']) . '-' . Str::lower(Str::random(5)),
                'billing_email' => $validated['admin_email'],
                'phone' => $validated['phone'] ?? null,
                'address' => $validated['address'] ?? null,
                'plan' => $plan ? $plan->key : 'free',
                'plan_id' => $plan ? $plan->id : null,
                'monitor_limit' => $validated['monitor_limit'] ?? ($plan ? $plan->monitor_limit : 5),
                'team_member_limit' => $plan ? $plan->team_member_limit : 3,
                'is_active' => true,
                'is_suspended' => false,
                'is_expired' => false,
                'custom_features' => $customFeatures,
            ]);

            $user = User::create([
                'name' => $adminName,
                'email' => $validated['admin_email'],
                'password' => Hash::make($password),
                'role' => 'org_admin',
                'organization_id' => $organization->id,
            ]);

            $organization->users()->attach($user->id, ['role' => 'org_admin']);

            if ($plan) {
                Subscription::create([
                    'organization_id' => $organization->id,
                    'plan_id' => $plan->id,
                    'billing_cycle' => 'monthly',
                    'status' => 'active',
                    'billing_provider' => 'radius',
                    'provider_subscription_id' => 'rad_' . uniqid(),
                    'current_period_starts_at' => now(),
                    'current_period_ends_at' => now()->addMonth(),
                ]);
            }

            DB::commit();

            // Attempt welcome email dispatch
            try {
                MailService::sendRegistrationEmail($user, $password);
            } catch (\Throwable) {
                // Silently continue if mail not yet fully setup
            }

            return response()->json([
                'success' => true,
                'message' => 'Organization provisioned successfully.',
                'organization' => [
                    'id' => $organization->id,
                    'name' => $organization->name,
                    'slug' => $organization->slug,
                    'plan' => $organization->plan,
                    'monitor_limit' => $organization->monitor_limit,
                    'radius_username' => $customFeatures['radius_username'] ?? null,
                    'external_id' => $customFeatures['external_id'] ?? null,
                    'is_suspended' => false,
                    'created_at' => $organization->created_at->toIso8601String(),
                ],
                'admin_user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'temporary_password' => empty($validated['admin_password']) ? $password : null,
                ],
                'login_url' => url('/login'),
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'error' => 'Failed to provision organization: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Suspend (disable) an organization.
     */
    public function suspend(Request $request, $id = null): JsonResponse
    {
        $this->checkPermission('radius_allow_suspend', 'Suspend Organization');

        $identifier = $id ?: ($request->input('org_id') ?: $request->input('radius_username') ?: $request->input('identifier'));
        if (! $identifier) {
            return response()->json(['success' => false, 'error' => 'Missing organization ID or identifier.'], 422);
        }

        $org = $this->resolveOrganization($identifier);
        $reason = $request->input('reason', 'Suspended via Radius ISP API');

        $org->update([
            'is_suspended' => true,
            'suspension_reason' => $reason,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Organization '{$org->name}' suspended successfully.",
            'organization_id' => $org->id,
            'is_suspended' => true,
            'suspension_reason' => $reason,
        ]);
    }

    /**
     * Unsuspend (enable) an organization.
     */
    public function unsuspend(Request $request, $id = null): JsonResponse
    {
        $this->checkPermission('radius_allow_suspend', 'Unsuspend Organization');

        $identifier = $id ?: ($request->input('org_id') ?: $request->input('radius_username') ?: $request->input('identifier'));
        if (! $identifier) {
            return response()->json(['success' => false, 'error' => 'Missing organization ID or identifier.'], 422);
        }

        $org = $this->resolveOrganization($identifier);

        $org->update([
            'is_suspended' => false,
            'suspension_reason' => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Organization '{$org->name}' unsuspended successfully.",
            'organization_id' => $org->id,
            'is_suspended' => false,
        ]);
    }

    /**
     * Expire an organization (e.g. billing subscription expired).
     */
    public function expire(Request $request, $id = null): JsonResponse
    {
        $this->checkPermission('radius_allow_expire', 'Expire Organization');

        $identifier = $id ?: ($request->input('org_id') ?: $request->input('radius_username') ?: $request->input('identifier'));
        if (! $identifier) {
            return response()->json(['success' => false, 'error' => 'Missing organization ID or identifier.'], 422);
        }

        $org = $this->resolveOrganization($identifier);
        $org->update(['is_expired' => true]);

        return response()->json([
            'success' => true,
            'message' => "Organization '{$org->name}' marked as expired.",
            'organization_id' => $org->id,
            'is_expired' => true,
        ]);
    }

    /**
     * Unexpire an organization.
     */
    public function unexpire(Request $request, $id = null): JsonResponse
    {
        $this->checkPermission('radius_allow_expire', 'Unexpire Organization');

        $identifier = $id ?: ($request->input('org_id') ?: $request->input('radius_username') ?: $request->input('identifier'));
        if (! $identifier) {
            return response()->json(['success' => false, 'error' => 'Missing organization ID or identifier.'], 422);
        }

        $org = $this->resolveOrganization($identifier);
        $org->update(['is_expired' => false]);

        return response()->json([
            'success' => true,
            'message' => "Organization '{$org->name}' unexpired.",
            'organization_id' => $org->id,
            'is_expired' => false,
        ]);
    }

    /**
     * Edit / update organization details from Radius.
     */
    public function updateOrganization(Request $request, $id): JsonResponse
    {
        $this->checkPermission('radius_allow_edit', 'Edit Organization');

        $org = $this->resolveOrganization($id);

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'billing_email' => 'nullable|email',
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:255',
            'monitor_limit' => 'nullable|integer|min:1',
            'team_member_limit' => 'nullable|integer|min:1',
            'radius_username' => 'nullable|string|max:255',
            'external_id' => 'nullable|string|max:255',
        ]);

        $updates = [];
        foreach (['name', 'billing_email', 'phone', 'address', 'monitor_limit', 'team_member_limit'] as $f) {
            if (isset($validated[$f])) {
                $updates[$f] = $validated[$f];
            }
        }

        if (isset($validated['radius_username']) || isset($validated['external_id'])) {
            $custom = $org->custom_features ?? [];
            if (isset($validated['radius_username'])) {
                $custom['radius_username'] = $validated['radius_username'];
            }
            if (isset($validated['external_id'])) {
                $custom['external_id'] = $validated['external_id'];
            }
            $updates['custom_features'] = $custom;
        }

        if (! empty($updates)) {
            $org->update($updates);
        }

        return response()->json([
            'success' => true,
            'message' => "Organization '{$org->name}' updated successfully.",
            'organization' => $org->fresh(),
        ]);
    }

    /**
     * Change / upgrade / downgrade an organization plan.
     */
    public function changePlan(Request $request, $id): JsonResponse
    {
        $this->checkPermission('radius_allow_plan_change', 'Change Plan');

        $org = $this->resolveOrganization($id);

        $request->validate([
            'plan_id' => 'nullable',
            'plan_key' => 'nullable|string',
        ]);

        $plan = null;
        if ($request->filled('plan_id')) {
            $plan = Plan::find($request->plan_id);
        }
        if (! $plan && $request->filled('plan_key')) {
            $plan = Plan::where('key', $request->plan_key)->first();
        }

        if (! $plan) {
            return response()->json(['success' => false, 'error' => 'Valid plan_id or plan_key is required.'], 422);
        }

        $org->update([
            'plan' => $plan->key,
            'plan_id' => $plan->id,
            'monitor_limit' => $plan->monitor_limit,
            'team_member_limit' => $plan->team_member_limit,
        ]);

        // Update active subscription
        $sub = Subscription::where('organization_id', $org->id)->where('status', 'active')->first();
        if ($sub) {
            $sub->update([
                'plan_id' => $plan->id,
            ]);
        } else {
            Subscription::create([
                'organization_id' => $org->id,
                'plan_id' => $plan->id,
                'billing_cycle' => 'monthly',
                'status' => 'active',
                'billing_provider' => 'radius',
                'provider_subscription_id' => 'rad_' . uniqid(),
                'current_period_starts_at' => now(),
                'current_period_ends_at' => now()->addMonth(),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => "Plan changed to '{$plan->name}' successfully.",
            'organization' => $org->fresh(),
            'new_plan' => $plan,
        ]);
    }

    /**
     * Deprovision / delete an organization.
     */
    public function destroyOrganization(Request $request, $id): JsonResponse
    {
        $this->checkPermission('radius_allow_delete', 'Delete Organization');

        $org = $this->resolveOrganization($id);
        $name = $org->name;
        $org->delete();

        return response()->json([
            'success' => true,
            'message' => "Organization '{$name}' deprovisioned and deleted successfully.",
        ]);
    }

    /**
     * Get organization live status, monitor count, incidents, and limits.
     */
    public function getStatus(Request $request, $id): JsonResponse
    {
        $org = $this->resolveOrganization($id);

        $monitorsCount = Monitor::where('organization_id', $org->id)->count();
        $upCount = Monitor::where('organization_id', $org->id)->where('status', 'up')->count();
        $downCount = Monitor::where('organization_id', $org->id)->where('status', 'down')->count();
        $activeIncidents = $org->incidents()->whereIn('status', ['investigating', 'identified', 'monitoring'])->count();

        $adminUser = $org->users()->wherePivot('role', 'org_admin')->first();

        return response()->json([
            'success' => true,
            'organization' => [
                'id' => $org->id,
                'name' => $org->name,
                'slug' => $org->slug,
                'billing_email' => $org->billing_email,
                'phone' => $org->phone,
                'plan' => $org->plan,
                'monitor_limit' => $org->monitor_limit,
                'team_member_limit' => $org->team_member_limit,
                'is_suspended' => (bool) $org->is_suspended,
                'suspension_reason' => $org->suspension_reason,
                'is_expired' => (bool) $org->is_expired,
                'radius_username' => $org->custom_features['radius_username'] ?? null,
                'external_id' => $org->custom_features['external_id'] ?? null,
                'created_at' => $org->created_at->toIso8601String(),
            ],
            'usage' => [
                'monitors_total' => $monitorsCount,
                'monitors_up' => $upCount,
                'monitors_down' => $downCount,
                'monitors_available' => max(0, $org->monitor_limit - $monitorsCount),
                'active_incidents' => $activeIncidents,
            ],
            'admin_contact' => $adminUser ? [
                'name' => $adminUser->name,
                'email' => $adminUser->email,
            ] : null,
        ]);
    }

    /**
     * List all organizations managed via Radius.
     */
    public function listOrganizations(Request $request): JsonResponse
    {
        $query = Organization::query();

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('billing_email', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%")
                    ->orWhere('custom_features->radius_username', 'like', "%{$search}%");
            });
        }

        if ($status = $request->query('status')) {
            if ($status === 'suspended') {
                $query->where('is_suspended', true);
            } elseif ($status === 'expired') {
                $query->where('is_expired', true);
            } elseif ($status === 'active') {
                $query->where('is_suspended', false)->where('is_expired', false);
            }
        }

        $perPage = min((int) ($request->query('per_page', 25)), 100);
        $paginated = $query->latest()->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $paginated->items(),
            'current_page' => $paginated->currentPage(),
            'last_page' => $paginated->lastPage(),
            'total' => $paginated->total(),
        ]);
    }

    /**
     * List all active plans for Radius subscribers.
     */
    public function listPlans(Request $request): JsonResponse
    {
        $plans = Plan::where('is_active', true)
            ->orderBy('price')
            ->get(['id', 'key', 'name', 'price', 'billing_period', 'monitor_limit', 'check_interval_seconds', 'team_member_limit', 'features']);

        return response()->json([
            'success' => true,
            'plans' => $plans,
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // SUPER ADMIN SETTINGS & MANAGEMENT ENDPOINTS
    // ─────────────────────────────────────────────────────────────

    /**
     * Get Radius configuration and feature toggles for Super Admin.
     */
    public function getSettings(Request $request): JsonResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403);

        $keys = [
            'radius_enabled',
            'radius_api_key',
            'radius_allow_provision',
            'radius_allow_suspend',
            'radius_allow_expire',
            'radius_allow_edit',
            'radius_allow_delete',
            'radius_allow_plan_change',
            'radius_default_plan_id',
        ];

        $settings = GlobalSetting::whereIn('key', $keys)->pluck('value', 'key')->toArray();

        return response()->json([
            'radius_enabled' => ($settings['radius_enabled'] ?? '1') !== '0',
            'radius_api_key' => $settings['radius_api_key'] ?? '',
            'radius_allow_provision' => ($settings['radius_allow_provision'] ?? '1') !== '0',
            'radius_allow_suspend' => ($settings['radius_allow_suspend'] ?? '1') !== '0',
            'radius_allow_expire' => ($settings['radius_allow_expire'] ?? '1') !== '0',
            'radius_allow_edit' => ($settings['radius_allow_edit'] ?? '1') !== '0',
            'radius_allow_delete' => ($settings['radius_allow_delete'] ?? '1') !== '0',
            'radius_allow_plan_change' => ($settings['radius_allow_plan_change'] ?? '1') !== '0',
            'radius_default_plan_id' => $settings['radius_default_plan_id'] ?? null,
            'api_base_url' => url('/api/v1/radius'),
        ]);
    }

    /**
     * Update Radius settings and feature toggles.
     */
    public function updateSettings(Request $request): JsonResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403);

        $data = $request->validate([
            'radius_enabled' => 'nullable',
            'radius_api_key' => 'nullable|string',
            'radius_allow_provision' => 'nullable',
            'radius_allow_suspend' => 'nullable',
            'radius_allow_expire' => 'nullable',
            'radius_allow_edit' => 'nullable',
            'radius_allow_delete' => 'nullable',
            'radius_allow_plan_change' => 'nullable',
            'radius_default_plan_id' => 'nullable',
        ]);

        foreach ($data as $key => $val) {
            if (is_bool($val)) {
                $val = $val ? '1' : '0';
            }
            GlobalSetting::updateOrCreate(['key' => $key], ['value' => (string) $val]);
        }

        return $this->getSettings($request);
    }
}
