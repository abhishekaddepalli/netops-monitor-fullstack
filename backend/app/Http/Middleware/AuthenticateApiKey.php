<?php

namespace App\Http\Middleware;

use App\Models\ApiKey;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Used on routes under /api/v1/* that should accept either a logged-in
 * Sanctum session/token (normal dashboard usage) OR a raw API key via the
 * `X-API-Key` header (third-party integrations, scripts, CI pipelines).
 * If an API key is present and valid, it resolves a "synthetic" acting
 * context: $request->attributes->get('organization') is set directly
 * (skipping the user-based ScopeToOrganization middleware), and scope
 * checks happen per-route via $request->attributes->get('api_key')->hasScope(...).
 */
class AuthenticateApiKey
{
    public function handle(Request $request, Closure $next): Response
    {
        $headerKey = $request->header('X-API-Key');

        if (! $headerKey) {
            return $next($request); // fall through to normal Sanctum auth
        }

        $apiKey = ApiKey::findByPlaintext($headerKey);

        if (! $apiKey) {
            return response()->json(['message' => 'Invalid or expired API key.'], 401);
        }

        if (! empty($apiKey->ip_whitelist) && ! in_array($request->ip(), $apiKey->ip_whitelist, true)) {
            return response()->json(['message' => 'Request IP not allowed for this API key.'], 403);
        }

        $apiKey->update(['last_used_at' => now()]);

        $request->attributes->set('organization', $apiKey->organization);
        $request->attributes->set('org_id', $apiKey->organization_id);
        $request->attributes->set('api_key', $apiKey);
        $request->attributes->set('authenticated_via', 'api_key');

        return $next($request);
    }
}
