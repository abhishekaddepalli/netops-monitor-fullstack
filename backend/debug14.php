<?php
$monitors = App\Models\Monitor::all();
foreach ($monitors as $m) {
    echo "ID: $m->id Status: $m->status Checks: " . $m->checks()->count() . "\n";
}
