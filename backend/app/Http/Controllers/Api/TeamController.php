<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Str;
use Illuminate\Support\Facades\Validator;

class TeamController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $org = $request->attributes->get('organization');

        return response()->json($org->teams()->withCount('members', 'monitors')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $org = $request->attributes->get('organization');
        abort_unless($request->user()->isOrgAdmin(), 403);

        $validator = Validator::make($request->all(), ['name' => ['required', 'string', 'max:255']]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $team = $org->teams()->create($validator->validated());

        return response()->json($team, 201);
    }

    /** List org members with their roles — the "Team" admin screen. */
    public function members(Request $request): JsonResponse
    {
        $org = $request->attributes->get('organization');

        $members = $org->users()->get()->map(fn ($u) => [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'role' => $u->pivot->role,
            'joined_at' => $u->pivot->joined_at,
            'last_login_at' => $u->last_login_at,
        ]);

        return response()->json($members);
    }

    /**
     * Invite a new user into the organization. In production this would
     * send an invitation email with a signed acceptance link rather than
     * creating the account outright; kept simple here (creates the user
     * with a random temp password) to stay within scope — swap for a
     * proper Invitation model + signed-URL flow when needed.
     */
    public function inviteMember(Request $request): JsonResponse
    {
        $org = $request->attributes->get('organization');
        abort_unless($request->user()->isOrgAdmin(), 403, 'Only Org Admins can invite team members.');

        if ($org->users()->count() >= $org->team_member_limit) {
            return response()->json(['message' => "Team member limit reached for your plan ({$org->team_member_limit})."], 422);
        }

        $validator = Validator::make($request->all(), [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'role' => ['required', 'in:org_admin,operator,read_only'],
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $tempPassword = Str::random(16);

        $user = User::create([
            'organization_id' => $org->id,
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($tempPassword),
        ]);

        $org->users()->attach($user->id, [
            'role' => $request->role,
            'invited_at' => now(),
            'invited_by' => $request->user()->id,
        ]);

        AuditLog::record('team.member_invited', $user, ['role' => $request->role]);

        // TODO: dispatch SendInvitationEmail notification with $tempPassword / a signed reset link.

        return response()->json(['message' => 'Team member invited.', 'user' => $user], 201);
    }

    public function updateMemberRole(Request $request, User $user): JsonResponse
    {
        $org = $request->attributes->get('organization');
        abort_unless($request->user()->isOrgAdmin(), 403);

        $validator = Validator::make($request->all(), ['role' => ['required', 'in:org_admin,operator,read_only']]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $org->users()->updateExistingPivot($user->id, ['role' => $request->role]);
        AuditLog::record('team.member_role_changed', $user, ['new_role' => $request->role]);

        return response()->json(['message' => 'Role updated.']);
    }

    public function removeMember(Request $request, User $user): JsonResponse
    {
        $org = $request->attributes->get('organization');
        abort_unless($request->user()->isOrgAdmin(), 403);
        abort_if($user->id === $request->user()->id, 422, 'You cannot remove yourself.');

        $org->users()->detach($user->id);
        AuditLog::record('team.member_removed', $user);

        return response()->json(['message' => 'Member removed from organization.']);
    }
}
