<?php

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$monitor = App\Models\Monitor::where('target', '103.164.208.174')->orWhere('target', '183.164.208.174')->first();

if (!$monitor) {
    echo "Monitor not found.\n";
    exit;
}

echo "MONITOR STATE:\n";
echo "ID: {$monitor->id}\n";
echo "Name: {$monitor->name}\n";
echo "Target: {$monitor->target}\n";
echo "Status: {$monitor->status}\n";
echo "Consecutive Failures: {$monitor->consecutive_failures}\n";
echo "Confirmation Failures: {$monitor->confirmation_failures}\n";
echo "Last Checked At: {$monitor->last_checked_at}\n";
echo "Next Check At: {$monitor->next_check_at}\n";

echo "\nLAST 10 CHECKS:\n";
$checks = $monitor->checks()->latest('checked_at')->take(10)->get();
foreach ($checks as $check) {
    echo "- ID: {$check->id} | Result: {$check->result} | Response Time: {$check->response_time_ms} | Checked At: {$check->checked_at}\n";
}
