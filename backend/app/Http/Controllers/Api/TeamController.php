<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
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
        try {
            $org = $request->attributes->get('organization');
            abort_unless($request->user()->isOrgAdmin(), 403, 'Only Org Admins can invite team members.');

            if ($org->team_member_limit !== null && $org->team_member_limit !== -1 && $org->users()->count() >= $org->team_member_limit) {
                return response()->json(['message' => "Team member limit reached for your plan ({$org->team_member_limit})."], 403);
            }

            $validator = Validator::make($request->all(), [
                'name' => ['required', 'string', 'max:255'],
                'email' => ['required', 'email'],
                'role' => ['required', 'in:org_admin,operator,read_only'],
            ]);
            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $user = User::withTrashed()->where('email', $request->email)->first();
            $tempPassword = Str::random(16);

            if ($user) {
                if ($user->trashed()) {
                    $user->restore();
                }
                if ($org->users()->where('users.id', $user->id)->exists()) {
                    return response()->json(['errors' => ['email' => ['This user is already a member of the team.']]], 422);
                }
                $user->password = Hash::make($tempPassword);
                $user->save();
            } else {
                $user = User::create([
                    'organization_id' => $org->id,
                    'name' => $request->name,
                    'email' => $request->email,
                    'password' => Hash::make($tempPassword),
                ]);
            }

            $org->users()->attach($user->id, [
                'role' => $request->role,
                'invited_at' => now(),
                'invited_by' => $request->user()->id,
            ]);

            AuditLog::record('team.member_invited', $user, ['role' => $request->role]);

            defer(fn() => \Illuminate\Support\Facades\Mail::to($user->email)->send(
                new \App\Mail\TeamInvitationMail($user, $org, $tempPassword)
            ));

            return response()->json(['message' => 'Team member invited.', 'user' => $user], 201);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Error inviting team member.',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ], 500);
        }
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
    public function update(Request $request, User $user): JsonResponse
    {
        $org = $request->attributes->get('organization');
        abort_unless($request->user()->isOrgAdmin(), 403);

        $validator = Validator::make($request->all(), [
            'name' => ['required', 'string', 'max:255'],
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user->update(['name' => $request->name]);
        AuditLog::record('team.member_updated', $user, ['name' => $request->name]);

        return response()->json(['message' => 'Member details updated.', 'user' => $user]);
    }

    public function updatePassword(Request $request, User $user): JsonResponse
    {
        $org = $request->attributes->get('organization');
        abort_unless($request->user()->isOrgAdmin(), 403);

        $validator = Validator::make($request->all(), [
            'password' => ['required', 'string', 'min:8'],
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user->update(['password' => Hash::make($request->password)]);
        AuditLog::record('team.member_password_changed', $user, []);

        return response()->json(['message' => 'Member password updated.']);
    }
}
