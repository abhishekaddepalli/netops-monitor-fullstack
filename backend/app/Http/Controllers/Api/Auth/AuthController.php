<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    /**
     * Self-service signup: creates a new Organization + its first user as
     * org_admin, on the Free plan. This is the path a new tenant takes —
     * distinct from an Org Admin inviting a teammate (see TeamController).
     */
    public function register(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'organization_name' => ['required', 'string', 'max:255'],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::min(10)->mixedCase()->numbers()],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $freePlan = Plan::where('key', 'free')->first();

        $organization = Organization::create([
            'name' => $request->organization_name,
            'plan' => 'free',
            'monitor_limit' => $freePlan->monitor_limit ?? 10,
            'team_member_limit' => $freePlan->team_member_limit ?? 2,
            'trial_ends_at' => now()->addDays(14),
        ]);

        $user = User::create([
            'organization_id' => $organization->id,
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'system_role' => 'standard',
        ]);

        $organization->users()->attach($user->id, [
            'role' => 'org_admin',
            'joined_at' => now(),
        ]);

        try {
            \App\Services\MailService::sendWelcome($user, $organization);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning("Registration welcome email could not be sent: " . $e->getMessage());
        }

        $token = $user->createToken('default')->plainTextToken;

        return response()->json([
            'user' => $user,
            'organization' => $organization,
            'token' => $token,
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Invalid credentials.'], 401);
        }

        if (! $user->is_active) {
            return response()->json(['message' => 'This account has been deactivated.'], 403);
        }

        if ($user->organization && ($user->organization->is_suspended || ! $user->organization->is_active)) {
            return response()->json(['message' => 'This organization account is suspended.'], 403);
        }

        if ($user->two_factor_enabled && !empty($user->two_factor_secret)) {
            $twoFactorToken = \Illuminate\Support\Str::random(64);
            cache()->put('2fa_challenge_' . $twoFactorToken, $user->id, now()->addMinutes(5));

            return response()->json([
                'two_factor_required' => true,
                'two_factor_token' => $twoFactorToken,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                ],
            ]);
        }

        $user->update(['last_login_at' => now(), 'last_login_ip' => $request->ip()]);

        $token = $user->createToken($request->userAgent() ?? 'api')->plainTextToken;

        return response()->json([
            'user' => $user->load('organization'),
            'token' => $token,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out.']);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('organization');

        return response()->json([
            'user' => $user,
            'role' => $user->roleInOrganization(),
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'max:255', 'unique:users,email,'.$user->id],
            'password' => ['sometimes', 'confirmed', Password::min(10)->mixedCase()->numbers()],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $request->only(['name', 'email']);
        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
        }

        $user->update($data);

        return response()->json(['user' => $user->load('organization')]);
    }
}
