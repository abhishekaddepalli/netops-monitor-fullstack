<?php
require '/root/netops-monitor-fullstack/backend/vendor/autoload.php';
$app = require_once '/root/netops-monitor-fullstack/backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$monitor = \App\Models\Monitor::find(21);
$monitor->load(['serverMetrics' => fn($q) => $q->latest('created_at')->limit(30)]);
$json = $monitor->toJson();
$arr = json_decode($json, true);
echo "Type of interfaces: " . gettype($arr['server_metrics'][0]['interfaces']) . "\n";
