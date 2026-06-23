<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\GlobalSetting;

class RadiusAuthMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $radiusKey = GlobalSetting::getValue('radius_api_key');
        $headerKey = $request->header('X-Radius-Key');

        if (!$radiusKey || !$headerKey || !hash_equals($radiusKey, $headerKey)) {
            return response()->json([
                'error' => 'Unauthorized. Invalid or missing X-Radius-Key header.'
            ], 401);
        }

        return $next($request);
    }
}
