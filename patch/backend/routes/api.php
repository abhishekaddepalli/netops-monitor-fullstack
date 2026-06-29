<?php

use App\Http\Controllers\Api\Admin\MonitoringNodeController;
use App\Http\Controllers\Api\Admin\OrganizationController;
use App\Http\Controllers\Api\AdminIntegrationController;
use App\Http\Controllers\Api\AlertChannelController;
use App\Http\Controllers\Api\ApiKeyController;
use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\HeartbeatController;
use App\Http\Controllers\Api\IncidentController;
use App\Http\Controllers\Api\MonitorController;
use App\Http\Controllers\Api\StatusPageController;
use App\Http\Controllers\Api\TeamController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public routes — no auth
|--------------------------------------------------------------------------
*/
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
Route::get('/plans', [\App\Http\Controllers\Api\PlanController::class, 'index']);
Route::get('/global-settings', [\App\Http\Controllers\Api\Admin\SettingsController::class, 'publicShow']);

// Agent Routes
Route::get('/v1/agent/jobs', [\App\Http\Controllers\Api\AgentController::class, 'getJobs']);
Route::post('/v1/agent/results', [\App\Http\Controllers\Api\AgentController::class, 'postResults']);

// Heartbeat ping — hit by external cron jobs, deliberately outside /api/v1
// and outside Sanctum entirely (the token in the URL IS the credential).
Route::any('/hb/{token}', [HeartbeatController::class, 'ping']);

// Public status page data (status.company.com reads from this)
Route::get('/status-pages/public/{slug}', [StatusPageController::class, 'publicShow']);

/*
|--------------------------------------------------------------------------
| Authenticated routes — Sanctum token OR X-API-Key header
|--------------------------------------------------------------------------
*/
Route::get('/debug/{id}', function ($id) {
    $monitor = App\Models\Monitor::find($id);
    $checks = $monitor->checks()->latest('checked_at')->take(5)->get();
    return response()->json([
        'monitor' => $monitor,
        'checks' => $checks,
    ]);
});

Route::prefix('v1')->middleware(['api_key_or_sanctum'])->group(function () {

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::patch('/auth/profile', [AuthController::class, 'updateProfile']);
    });

    Route::middleware('org.scope')->group(function () {
        Route::patch('/organization', [\App\Http\Controllers\Api\OrganizationController::class, 'update'])->middleware('org.role:org_admin');
        Route::post('/billing/subscribe', [\App\Http\Controllers\Api\BillingController::class, 'subscribe'])->middleware('org.role:org_admin');
        Route::get('/billing/current', [\App\Http\Controllers\Api\BillingController::class, 'current'])->middleware('org.role:org_admin');

        // ── Dashboard ──────────────────────────────────────────────
        Route::get('/dashboard/summary', [DashboardController::class, 'summary']);
        Route::get('/dashboard/response-time-series', [DashboardController::class, 'responseTimeSeries']);

        // ── Monitors ───────────────────────────────────────────────
        Route::get('/monitors/export', [MonitorController::class, 'export']);
        Route::get('/monitors/import-template', [MonitorController::class, 'importTemplate']);
        Route::post('/monitors/import', [MonitorController::class, 'import'])->middleware('org.role:org_admin,operator');
        Route::get('/monitors', [MonitorController::class, 'index']);
        Route::post('/monitors', [MonitorController::class, 'store'])->middleware('org.role:org_admin,operator');
        Route::get('/monitors/{monitor}', [MonitorController::class, 'show']);
        Route::patch('/monitors/{monitor}', [MonitorController::class, 'update'])->middleware('org.role:org_admin,operator');
        Route::delete('/monitors/{monitor}', [MonitorController::class, 'destroy'])->middleware('org.role:org_admin');
        Route::post('/monitors/{monitor}/pause', [MonitorController::class, 'pause'])->middleware('org.role:org_admin,operator');
        Route::post('/monitors/{monitor}/resume', [MonitorController::class, 'resume'])->middleware('org.role:org_admin,operator');
        Route::post('/monitors/{monitor}/test', [MonitorController::class, 'test'])->middleware('org.role:org_admin,operator');
        Route::get('/monitors/{monitor}/checks', [MonitorController::class, 'checks']);
        Route::get('/monitors/{monitor}/chart', [MonitorController::class, 'chartData']);

        // ── Incidents ──────────────────────────────────────────────
        Route::get('/incidents', [IncidentController::class, 'index']);
        Route::get('/incidents/{incident}', [IncidentController::class, 'show']);
        Route::post('/incidents/{incident}/acknowledge', [IncidentController::class, 'acknowledge'])->middleware('org.role:org_admin,operator');
        Route::post('/incidents/{incident}/resolve', [IncidentController::class, 'resolve'])->middleware('org.role:org_admin,operator');
        Route::post('/incidents/{incident}/updates', [IncidentController::class, 'addUpdate'])->middleware('org.role:org_admin,operator');

        // ── Status Pages ───────────────────────────────────────────
        Route::get('/status-pages', [StatusPageController::class, 'index']);
        Route::post('/status-pages', [StatusPageController::class, 'store'])->middleware('org.role:org_admin');
        Route::patch('/status-pages/{statusPage}', [StatusPageController::class, 'update'])->middleware('org.role:org_admin');
        Route::delete('/status-pages/{statusPage}', [StatusPageController::class, 'destroy'])->middleware('org.role:org_admin');

        // ── Alert Channels ─────────────────────────────────────────
        Route::get('/alert-channels', [AlertChannelController::class, 'index']);
        Route::post('/alert-channels', [AlertChannelController::class, 'store'])->middleware('org.role:org_admin');
        Route::patch('/alert-channels/{alertChannel}', [AlertChannelController::class, 'update'])->middleware('org.role:org_admin');
        Route::delete('/alert-channels/{alertChannel}', [AlertChannelController::class, 'destroy'])->middleware('org.role:org_admin');
        Route::post('/alert-channels/{alertChannel}/test', [AlertChannelController::class, 'test'])->middleware('org.role:org_admin');

        // ── Team ───────────────────────────────────────────────────
        Route::get('/team/members', [TeamController::class, 'members']);
        Route::post('/team/invite', [TeamController::class, 'inviteMember'])->middleware('org.role:org_admin');
        Route::patch('/team/members/{user}/role', [TeamController::class, 'updateMemberRole'])->middleware('org.role:org_admin');
        Route::delete('/team/members/{user}', [TeamController::class, 'removeMember'])->middleware('org.role:org_admin');
        Route::get('/teams', [TeamController::class, 'index']);
        Route::post('/teams', [TeamController::class, 'store'])->middleware('org.role:org_admin');

        // ── API Keys ───────────────────────────────────────────────
        Route::get('/api-keys', [ApiKeyController::class, 'index']);
        Route::post('/api-keys', [ApiKeyController::class, 'store'])->middleware('org.role:org_admin');
        Route::delete('/api-keys/{apiKey}', [ApiKeyController::class, 'destroy'])->middleware('org.role:org_admin');
    });
});

/*
|--------------------------------------------------------------------------
| Super Admin routes — cross-tenant management
|--------------------------------------------------------------------------
*/
Route::prefix('v1/admin')->middleware(['auth:sanctum', 'org.role:super_admin'])->group(function () {
    Route::get('/dashboard', [\App\Http\Controllers\Api\Admin\DashboardController::class, 'summary']);
    Route::get('/server-health', [\App\Http\Controllers\Api\Admin\ServerHealthController::class, 'index']);

    Route::get('/organizations/export', [OrganizationController::class, 'export']);
    Route::get('/organizations/import-template', [OrganizationController::class, 'importTemplate']);
    Route::post('/organizations/import', [OrganizationController::class, 'import']);
    Route::get('/organizations', [OrganizationController::class, 'index']);
    Route::post('/organizations', [OrganizationController::class, 'store']);
    Route::patch('/organizations/{organization}', [OrganizationController::class, 'update']);
    Route::post('/organizations/{organization}/suspend', [OrganizationController::class, 'suspend']);
    Route::post('/organizations/{organization}/unsuspend', [OrganizationController::class, 'unsuspend']);
    Route::post('/organizations/{organization}/expire', [OrganizationController::class, 'expire']);
    Route::post('/organizations/{organization}/unexpire', [OrganizationController::class, 'unexpire']);
    Route::delete('/organizations/{organization}', [OrganizationController::class, 'destroy']);

    Route::apiResource('plans', \App\Http\Controllers\Api\Admin\PlanController::class)->except(['show']);

    Route::get('/monitoring-nodes', [MonitoringNodeController::class, 'index']);
    Route::post('/monitoring-nodes', [MonitoringNodeController::class, 'store']);
    Route::patch('/monitoring-nodes/{monitoring_node}', [MonitoringNodeController::class, 'update']);

    // Settings and Status Pages
    Route::get('/status-pages/{slug}', [\App\Http\Controllers\Api\PublicStatusPageController::class, 'show']);
    Route::get('/settings', [\App\Http\Controllers\Api\Admin\SettingsController::class, 'show']);
    Route::patch('/settings', [\App\Http\Controllers\Api\Admin\SettingsController::class, 'update']);

    Route::get('/invoices', [\App\Http\Controllers\Api\Admin\InvoiceController::class, 'index']);
    Route::get('/invoices/{id}', [\App\Http\Controllers\Api\Admin\InvoiceController::class, 'show']);
    Route::get('/logs', [\App\Http\Controllers\Api\Admin\AuditLogController::class, 'index']);
    Route::delete('/logs', [\App\Http\Controllers\Api\Admin\AuditLogController::class, 'destroy']);
    Route::get('/logs/export', [\App\Http\Controllers\Api\Admin\AuditLogController::class, 'export']);

    Route::get('/integrations', [AdminIntegrationController::class, 'index']);
    Route::post('/integrations', [AdminIntegrationController::class, 'update']);
    Route::post('/integrations/test/{provider}', [AdminIntegrationController::class, 'test']);
    
    Route::apiResource('alert-channels', \App\Http\Controllers\Api\Admin\AlertChannelController::class);
    Route::post('alert-channels/{alert_channel}/test', [\App\Http\Controllers\Api\Admin\AlertChannelController::class, 'test']);
    
    Route::apiResource('notification-templates', \App\Http\Controllers\Api\Admin\NotificationTemplateController::class)->only(['index', 'show', 'update']);
});

/*
|--------------------------------------------------------------------------
| Radius Integration (External Webhook/API endpoints)
|--------------------------------------------------------------------------
*/
    Route::middleware([\App\Http\Middleware\RadiusAuthMiddleware::class])->prefix('radius')->group(function () {
        Route::post('/organizations', [\App\Http\Controllers\Api\Admin\RadiusController::class, 'createOrganization']);
        Route::post('/organizations/{organization}/suspend', [\App\Http\Controllers\Api\Admin\RadiusController::class, 'suspendOrganization']);
        Route::post('/organizations/{organization}/unsuspend', [\App\Http\Controllers\Api\Admin\RadiusController::class, 'unsuspendOrganization']);
        Route::post('/organizations/{organization}/expire', [\App\Http\Controllers\Api\Admin\RadiusController::class, 'expireOrganization']);
        Route::post('/organizations/{organization}/unexpire', [\App\Http\Controllers\Api\Admin\RadiusController::class, 'unexpireOrganization']);
        Route::delete('/organizations/{organization}', [\App\Http\Controllers\Api\Admin\RadiusController::class, 'destroyOrganization']);
        Route::post('/subscriptions', [\App\Http\Controllers\Api\Admin\RadiusController::class, 'subscribe']);
    });
