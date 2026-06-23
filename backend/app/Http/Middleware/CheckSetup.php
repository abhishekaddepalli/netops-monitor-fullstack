<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckSetup
{
    public function handle(Request $request, Closure $next): Response
    {
        $isInstalled = file_exists(storage_path('installed'));
        $isSetupRoute = $request->is('setup') || $request->is('setup/*');

        // Allow static assets to load even if not installed
        if ($request->is('assets/*') || $request->is('*.css') || $request->is('*.js')) {
            return $next($request);
        }

        // If not installed and not on a setup route, redirect to setup
        if (!$isInstalled && !$isSetupRoute) {
            return redirect('/setup');
        }

        // If installed and trying to access setup routes, redirect to home
        if ($isInstalled && $isSetupRoute) {
            return redirect('/');
        }

        return $next($request);
    }
}
