<?php
require '/root/netops-monitor-fullstack/backend/vendor/autoload.php';
$app = require_once '/root/netops-monitor-fullstack/backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$metrics = \App\Models\ServerMetric::latest('created_at')->take(5)->get();
echo "Total metrics in DB: " . \App\Models\ServerMetric::count() . "\n";
foreach ($metrics as $m) {
    echo $m->created_at . " | MonitorID: {$m->monitor_id} | CPU: {$m->cpu_usage_pct} | Interfaces count: " . count($m->interfaces ?? []) . "\n";
    if (is_array($m->interfaces) && count($m->interfaces) > 0) {
        $eth7 = collect($m->interfaces)->firstWhere('name', 'ether7-BSNL');
        if ($eth7) {
            echo "  ether7-BSNL: in=" . $eth7['in_octets'] . " out=" . $eth7['out_octets'] . "\n";
        }
    }
}
