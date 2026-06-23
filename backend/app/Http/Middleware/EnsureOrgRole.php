<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Usage in routes: ->middleware('org.role:org_admin') or 'org.role:org_admin,operator'
 * Super Admins always pass (system_role === 'super_admin'), regardless of
 * which org-level role(s) are listed — they manage every tenant.
 */
class EnsureOrgRole
{
    public function handle(Request $request, Closure $next, string ...$allowedRoles): Response
    {
        if ($request->attributes->has('api_key')) {
            return $next($request);
        }

        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if ($user->isSuperAdmin()) {
            return $next($request);
        }

        $role = $user->roleInOrganization();

        if (! $role || ! in_array($role, $allowedRoles, true)) {
            return response()->json([
                'message' => 'You do not have permission to perform this action.',
                'required_role' => $allowedRoles,
                'your_role' => $role,
            ], 403);
        }

        return $next($request);
    }
}
