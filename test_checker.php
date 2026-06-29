<?php
require '/root/netops-monitor-fullstack/backend/vendor/autoload.php';
$app = require_once '/root/netops-monitor-fullstack/backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$monitor = \App\Models\Monitor::find(21);
echo "Status: " . $monitor->status . "\n";
echo "Fails: " . $monitor->current_failures . " (thresh: " . $monitor->confirmation_failures . ")\n";
echo "Succs: " . $monitor->current_successes . " (thresh: " . $monitor->confirmation_successes . ")\n";
