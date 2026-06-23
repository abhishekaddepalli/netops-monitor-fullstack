<?php
$monitor = App\Models\Monitor::find(13);
echo "Monitor: " . $monitor->name . "\n";
$query = App\Models\Monitor::query()
            ->where('id', 13)
            ->where('is_paused', false)
            ->where(function ($q) {
                $q->where('maintenance_mode', false)
                    ->orWhere('maintenance_until', '<', now());
            })
            ->where('next_check_at', '<=', now())
            ->whereNull('deleted_at');
echo "Is it picked up? " . ($query->exists() ? 'YES' : 'NO') . "\n";

echo "Check is_paused: " . (App\Models\Monitor::where('id', 13)->where('is_paused', false)->exists() ? 'YES' : 'NO') . "\n";
echo "Check maintenance: " . (App\Models\Monitor::where('id', 13)->where(function ($q) {
                $q->where('maintenance_mode', false)
                    ->orWhere('maintenance_until', '<', now());
            })->exists() ? 'YES' : 'NO') . "\n";
echo "Check next_check_at: " . (App\Models\Monitor::where('id', 13)->where('next_check_at', '<=', now())->exists() ? 'YES' : 'NO') . "\n";
