<?php
echo "Total Checks: " . App\Models\Check::count() . "\n";
echo "Checks for monitor 13: " . App\Models\Check::where('monitor_id', 13)->count() . "\n";
