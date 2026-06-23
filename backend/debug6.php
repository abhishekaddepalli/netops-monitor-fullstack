<?php
$checks = App\Models\Check::selectRaw('monitor_id, count(*) as c')->groupBy('monitor_id')->get();
foreach ($checks as $check) {
    echo "Monitor ID: " . $check->monitor_id . " -> " . $check->c . " checks\n";
}
