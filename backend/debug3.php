<?php
$monitor = App\Models\Monitor::find(13);
echo "maintenance_mode: " . $monitor->maintenance_mode . "\n";
echo "maintenance_until: " . $monitor->maintenance_until . "\n";
echo "deleted_at: " . $monitor->deleted_at . "\n";
