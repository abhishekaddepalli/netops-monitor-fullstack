<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Monitor;
use App\Jobs\RunMonitorCheckJob;

echo "--- FORCE CHECK SCRIPT V2 ---\n";

$monitor = Monitor::first();
if (!$monitor) {
    die("No monitors found!\n");
}

echo "Found Monitor: {$monitor->name} (ID: {$monitor->id}, Type: {$monitor->type})\n";
echo "Current Status: {$monitor->status}\n";
echo "Testing synchronous check execution...\n";

try {
    $job = new RunMonitorCheckJob($monitor->id);
    $job->handle();
    echo "RunMonitorCheckJob completed successfully!\n";
} catch (\Throwable $e) {
    echo "EXCEPTION CAUGHT:\n";
    echo "Message: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . " Line: " . $e->getLine() . "\n";
    echo "Stack Trace:\n" . $e->getTraceAsString() . "\n";
}

echo "Check DB for state changes:\n";
$m = Monitor::find($monitor->id);
echo "New Status: {$m->status}\n";

$incident = $m->incidents()->latest()->first();
if ($incident) {
    echo "Latest Incident ID: {$incident->id}, State: {$incident->state}\n";
} else {
    echo "No incidents found.\n";
}

echo "--- END SCRIPT ---\n";
