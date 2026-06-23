<?php
$monitor = App\Models\Monitor::find(13);
echo "In maintenance: " . ($monitor->isInMaintenanceWindow() ? 'YES' : 'NO') . "\n";
echo "Next check at: " . $monitor->next_check_at . "\n";
echo "Now: " . now() . "\n";
