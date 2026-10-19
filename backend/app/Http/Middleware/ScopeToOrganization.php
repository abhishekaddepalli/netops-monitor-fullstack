<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Binds the resolved tenant Organization onto the request for controllers
 * to use ($request->attributes->get('organization')), and rejects requests
 * from users with no organization (other than Super Admins, who explicitly
 * pass ?organization_id= to act on a specific tenant — see SuperAdmin
 * controllers). This is the single chokepoint that prevents any controller
 * from accidentally leaking cross-tenant data if a `where('organization_id', ...)`
 * clause is forgotten somewhere downstream — paired with, not a replacement
 * for, scoping every query explicitly.
 */
class ScopeToOrganization
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->attributes->has('api_key')) {
            return $next($request);
        }

        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $org = null;

        if ($user->isSuperAdmin() && $request->has('organization_id')) {
            $org = \App\Models\Organization::find($request->organization_id);
        } else {
            $org = $user->organization;
        }

        if (! $org) {
            return response()->json(['message' => 'Your account is not attached to an organization.'], 403);
        }

        $request->attributes->set('organization', $org);
        $request->attributes->set('org_id', $org->id);

        return $next($request);
    }
}
