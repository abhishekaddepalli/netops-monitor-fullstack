<?php
$monitors = App\Models\Monitor::get();
foreach ($monitors as $monitor) {
    echo "ID: " . $monitor->id . " Name: " . $monitor->name . " target: " . $monitor->target . " next: " . $monitor->next_check_at . "\n";
}
