<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$exception = DB::table('failed_jobs')->latest('failed_at')->value('exception');
file_put_contents('exception.log', $exception);
