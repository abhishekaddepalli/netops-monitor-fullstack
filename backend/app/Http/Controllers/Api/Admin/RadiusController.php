<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

use App\Models\Organization;
use App\Models\User;
use App\Models\Plan;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class RadiusController extends Controller
{
    public function createOrganization(Request $request): JsonResponse
    {
        $data = $request->validate([
            'org_name' => 'required|string|max:255',
            'admin_name' => 'required|string|max:255',
            'admin_email' => 'required|email|unique:users,email',
            'admin_password' => 'required|string|min:8',
        ]);

        try {
            DB::beginTransaction();

            $org = Organization::create([
                'name' => $data['org_name'],
                'slug' => \Illuminate\Support\Str::slug($data['org_name']) . '-' . uniqid(),
            ]);

            $user = User::create([
                'name' => $data['admin_name'],
                'email' => $data['admin_email'],
                'password' => Hash::make($data['admin_password']),
                'organization_id' => $org->id,
                'role' => 'org_admin',
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Organization created successfully',
                'organization_id' => $org->id,
                'user_id' => $user->id,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Failed to provision organization', 'details' => $e->getMessage()], 500);
        }
    }

    public function suspendOrganization(Organization $organization): JsonResponse
    {
        $organization->update(['is_suspended' => true]);
        return response()->json(['message' => "Organization {$organization->name} suspended"]);
    }

    public function unsuspendOrganization(Organization $organization): JsonResponse
    {
        $organization->update(['is_suspended' => false]);
        return response()->json(['message' => "Organization {$organization->name} unsuspended"]);
    }

    public function expireOrganization(Organization $organization): JsonResponse
    {
        $organization->update(['is_expired' => true]);
        return response()->json(['message' => "Organization {$organization->name} expired"]);
    }

    public function unexpireOrganization(Organization $organization): JsonResponse
    {
        $organization->update(['is_expired' => false]);
        return response()->json(['message' => "Organization {$organization->name} unexpired"]);
    }

    public function destroyOrganization(Organization $organization): JsonResponse
    {
        $organization->delete();
        return response()->json(['message' => "Organization {$organization->name} deleted"]);
    }

    public function subscribe(Request $request): JsonResponse
    {
        $data = $request->validate([
            'organization_id' => 'required|exists:organizations,id',
            'plan_id' => 'required|exists:plans,id',
        ]);

        $org = Organization::findOrFail($data['organization_id']);
        $org->update(['plan_id' => $data['plan_id']]);

        return response()->json(['message' => "Organization subscribed to plan successfully"]);
    }
}
