<?php
echo "Jobs pending: " . \DB::table('jobs')->count() . "\n";
$jobs = \DB::table('jobs')->select('queue', 'attempts', 'reserved_at', 'available_at', 'created_at')->limit(5)->get();
foreach ($jobs as $job) {
    echo "Queue: " . $job->queue . " Attempts: " . $job->attempts . " Reserved: " . $job->reserved_at . " Available: " . $job->available_at . "\n";
}
