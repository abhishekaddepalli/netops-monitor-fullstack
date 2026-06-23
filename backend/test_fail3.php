<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$jobs = DB::table('failed_jobs')->get();
foreach ($jobs as $job) {
    echo $job->id . ': ' . json_decode($job->payload)->displayName . "\n";
}
