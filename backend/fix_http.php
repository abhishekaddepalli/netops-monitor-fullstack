<?php
$monitors = App\Models\Monitor::where('type', 'http')->where('target', 'not like', 'http%')->get();
foreach ($monitors as $monitor) {
    $monitor->target = 'https://' . $monitor->target;
    $monitor->save();
}
echo "Updated " . $monitors->count() . " monitors\n";
