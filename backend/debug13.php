<?php
try {
    $job = new App\Jobs\RunMonitorCheckJob(13);
    $job->handle();
    echo "Job finished for Monitor 13\n";
    $checks = App\Models\Check::where('monitor_id', 13)->count();
    echo "Checks count now: $checks\n";
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
