<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Organization;
use App\Models\User;
use App\Models\Plan;
use App\Models\Subscription;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class RadiusIntegrationController extends Controller
{
    /**
     * Authenticate via the Radius API Key.
     */
    private function verifyRadiusKey(Request $request): bool
    {
        $settings = json_decode(Storage::get('global_settings.json'), true) ?? [];
        $expectedKey = $settings['radius_api_key'] ?? null;
        
        $authHeader = $request->header('Authorization');
        if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
            return false;
        }

        $token = substr($authHeader, 7);
        return $expectedKey && hash_equals($expectedKey, $token);
    }

    public function provision(Request $request): JsonResponse
    {
        if (!$this->verifyRadiusKey($request)) {
            return response()->json(['message' => 'Unauthorized. Invalid or missing Radius API Key.'], 401);
        }

        $request->validate([
            'org_name' => 'required|string|max:255',
            'plan_key' => 'required|string|exists:plans,key',
            'admin_name' => 'required|string|max:255',
            'admin_email' => 'required|email|unique:users,email',
            'admin_password' => 'required|string|min:6',
        ]);

        $plan = Plan::where('key', $request->plan_key)->first();

        // Create Organization
        $organization = Organization::create([
            'name' => $request->org_name,
            'plan' => $plan->key,
            'monitor_limit' => $plan->monitor_limit,
            'team_member_limit' => $plan->team_member_limit,
            'is_suspended' => false,
        ]);

        // Create Admin User
        $user = User::create([
            'organization_id' => $organization->id,
            'name' => $request->admin_name,
            'email' => $request->admin_email,
            'password' => Hash::make($request->admin_password),
            'role' => 'org_admin',
        ]);

        // Create Active Subscription
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

        return response()->json([
            'message' => 'Provisioned successfully',
            'organization' => $organization,
            'user' => $user
        ], 201);
    }

    public function suspend(Request $request): JsonResponse
    {
        if (!$this->verifyRadiusKey($request)) {
            return response()->json(['message' => 'Unauthorized. Invalid or missing Radius API Key.'], 401);
        }

        $request->validate([
            'org_id' => 'required|integer|exists:organizations,id',
            'action' => 'required|in:suspend,unsuspend'
        ]);

        $organization = Organization::findOrFail($request->org_id);
        $organization->update([
            'is_suspended' => $request->action === 'suspend'
        ]);

        return response()->json([
            'message' => 'Organization ' . $request->action . 'ed successfully.',
            'organization' => $organization
        ]);
    }
}
