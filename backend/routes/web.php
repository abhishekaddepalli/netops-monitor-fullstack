<?php

use Illuminate\Support\Facades\Route;

/*
| This is a headless API backend (frontend is the separate dashboard
| build). This file exists only because Laravel's routing config
| requires it — kept minimal on purpose.
*/

Route::get('/auth/google/redirect', [\App\Http\Controllers\Api\Auth\GoogleAuthController::class, 'redirect']);
Route::get('/auth/google/callback', [\App\Http\Controllers\Api\Auth\GoogleAuthController::class, 'callback']);
Route::get('/api/v1/auth/google/redirect', [\App\Http\Controllers\Api\Auth\GoogleAuthController::class, 'redirect']);
Route::get('/api/v1/auth/google/callback', [\App\Http\Controllers\Api\Auth\GoogleAuthController::class, 'callback']);

// Fallback route: Serves the React SPA if built and copied into the public/ directory.
// If index.html doesn't exist, it falls back to a JSON API status message.
Route::fallback(function () {
    $indexPath = public_path('index.html');
    if (file_exists($indexPath)) {
        return response(file_get_contents($indexPath))
            ->header('Content-Type', 'text/html')
            ->header('Cache-Control', 'no-cache, no-store, must-revalidate')
            ->header('Pragma', 'no-cache')
            ->header('Expires', '0');
    }
    
    return response()->json([
        'name' => config('app.name'),
        'status' => 'ok',
        'docs' => '/api/v1',
        'message' => 'Frontend not built yet. Please run `npm run build` and copy the dist folder into public/.'
    ]);
});
