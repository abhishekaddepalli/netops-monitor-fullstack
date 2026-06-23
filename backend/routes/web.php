<?php

use Illuminate\Support\Facades\Route;

/*
| This is a headless API backend (frontend is the separate dashboard
| build). This file exists only because Laravel's routing config
| requires it — kept minimal on purpose.
*/
use App\Http\Controllers\SetupController;

// Setup Wizard Routes
Route::prefix('setup')->group(function () {
    Route::get('/', [SetupController::class, 'requirements']);
    Route::get('/database', [SetupController::class, 'database']);
    Route::post('/database', [SetupController::class, 'saveDatabase']);
    Route::get('/admin', [SetupController::class, 'admin']);
    Route::post('/admin', [SetupController::class, 'saveAdmin']);
    Route::get('/finish', [SetupController::class, 'finish']);
});

// Fallback route: Serves the React SPA if built and copied into the public/ directory.
// If index.html doesn't exist, it falls back to a JSON API status message.
Route::fallback(function () {
    $indexPath = public_path('index.html');
    if (file_exists($indexPath)) {
        return file_get_contents($indexPath);
    }
    
    return response()->json([
        'name' => config('app.name'),
        'status' => 'ok',
        'docs' => '/api/v1',
        'message' => 'Frontend not built yet. Please run `npm run build` and copy the dist folder into public/.'
    ]);
});
