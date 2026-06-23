<?php
$monitor = App\Models\Monitor::where('target', 'like', '%spidecloud%')->first();
if (!$monitor) { echo "Monitor not found\n"; exit; }
echo "Monitor ID: " . $monitor->id . "\n";
echo "Target: " . $monitor->target . "\n";
echo "Status: " . $monitor->status . "\n";
echo "Paused: " . ($monitor->is_paused ? 'Yes' : 'No') . "\n";
echo "Trashed: " . ($monitor->trashed() ? 'Yes' : 'No') . "\n";
$checker = App\Services\Monitors\MonitorCheckerFactory::make($monitor);
$result = $checker->check($monitor);
echo "Result: " . $result->result . "\n";
echo "Response Time: " . $result->responseTimeMs . "\n";
echo "Error Message: " . $result->errorMessage . "\n";
