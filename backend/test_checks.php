<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$request = \Illuminate\Http\Request::create('/api/v1/monitors/12/checks', 'GET');
$request->setUserResolver(function () { return \App\Models\User::find(1); });
$controller = app(\App\Http\Controllers\Api\MonitorController::class);
echo $controller->checks($request, \App\Models\Monitor::find(12))->getContent();
