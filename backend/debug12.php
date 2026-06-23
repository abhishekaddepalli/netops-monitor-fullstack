<?php
$m = App\Models\Monitor::find(13);
echo "Monitor 13 next_check_at: " . $m->next_check_at . "\n";
echo "Current Time: " . now() . "\n";
