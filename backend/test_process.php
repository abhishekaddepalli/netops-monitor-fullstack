<?php

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$monitor = App\Models\Monitor::find(1);
echo "Before: Status={$monitor->status}, Failures={$monitor->consecutive_failures}, LastCheck={$monitor->last_checked_at}\n";

try {
    App\Jobs\ProcessCheckResultJob::dispatchSync(1, 'down', 'Test error', null);
    echo "Job ran successfully.\n";
} catch (\Throwable $e) {
    echo "Job threw exception: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}

$monitor->refresh();
echo "After: Status={$monitor->status}, Failures={$monitor->consecutive_failures}, LastCheck={$monitor->last_checked_at}\n";
