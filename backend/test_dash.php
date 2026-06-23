<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$request = \Illuminate\Http\Request::create('/api/v1/dashboard/response-time', 'GET');
$request->setUserResolver(function () { return \App\Models\User::find(1); });
$request->attributes->set('organization', \App\Models\Organization::find(2));
$c = app(\App\Http\Controllers\Api\DashboardController::class);
echo $c->responseTimeSeries($request)->getContent();
