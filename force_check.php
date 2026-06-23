<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Monitor;
use App\Services\Monitors\MonitorService;
use App\Jobs\PerformCheckJob;
use App\Jobs\ProcessCheckResultJob;

echo "--- FORCE CHECK SCRIPT ---\n";

$monitor = Monitor::first();
if (!$monitor) {
    die("No monitors found!\n");
}

echo "Found Monitor: {$monitor->name} (ID: {$monitor->id}, Type: {$monitor->type})\n";
echo "Current Status: {$monitor->status}\n";
echo "Testing ping synchronously...\n";

try {
    $service = app(MonitorService::class);
    $result = $service->check($monitor);
    
    echo "Check Result: {$result->status}\n";
    echo "Response Time: {$result->responseTimeMs}ms\n";
    if ($result->errorMessage) {
        echo "Error: {$result->errorMessage}\n";
    }

    echo "Processing check result synchronously...\n";
    
    $job = new ProcessCheckResultJob($monitor, $result->status, $result->responseTimeMs, $result->errorMessage);
    $job->handle(app(\App\Services\IncidentManager::class));
    
    echo "ProcessCheckResultJob completed successfully!\n";
    
} catch (\Throwable $e) {
    echo "EXCEPTION CAUGHT:\n";
    echo "Message: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . " Line: " . $e->getLine() . "\n";
    echo "Stack Trace:\n" . $e->getTraceAsString() . "\n";
}

echo "--- END SCRIPT ---\n";
