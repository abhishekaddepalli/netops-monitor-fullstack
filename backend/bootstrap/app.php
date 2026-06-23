<?php

use App\Events\IncidentCreated;
use App\Events\IncidentResolved;
use App\Http\Middleware\AuthenticateApiKey;
use App\Http\Middleware\EnsureOrgRole;
use App\Http\Middleware\ScopeToOrganization;
use App\Listeners\DispatchIncidentAlerts;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Support\Facades\Event;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'api_key_or_sanctum' => AuthenticateApiKey::class,
            'org.scope' => ScopeToOrganization::class,
            'org.role' => EnsureOrgRole::class,
        ]);

        $middleware->append(\App\Http\Middleware\CheckSetup::class);

        $middleware->api(prepend: [
            AuthenticateApiKey::class,
        ]);

        $middleware->throttleApi('120,1'); // 120 req/min default API rate limit
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->shouldRenderJsonWhen(fn ($request) => $request->is('api/*') || $request->expectsJson());
    })
    ->withEvents(discover: false)
    ->booted(function () {
        Event::listen(IncidentCreated::class, [DispatchIncidentAlerts::class, 'handleCreated']);
        Event::listen(IncidentResolved::class, [DispatchIncidentAlerts::class, 'handleResolved']);
    })
    ->create();
