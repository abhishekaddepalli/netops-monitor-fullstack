<?php
$count = 0;
App\Models\Monitor::query()
    ->where('is_paused', false)
    ->where(function ($q) {
        $q->where('maintenance_mode', false)
            ->orWhere('maintenance_until', '<', now());
    })
    ->where('next_check_at', '<=', now())
    ->whereNull('deleted_at')
    ->select(['id', 'check_interval_seconds', 'type'])
    ->chunkById(500, function ($monitors) use (&$count) {
        foreach ($monitors as $monitor) {
            $count++;
            echo "Processing ID " . $monitor->id . "\n";
            App\Models\Monitor::where('id', $monitor->id)->update([
                'next_check_at' => now()->addSeconds($monitor->check_interval_seconds),
            ]);
        }
    });
echo "Processed $count monitors\n";
