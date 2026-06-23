<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$u = \App\Models\User::where('email', 'admin@netopsmonitor.in')->first();
if ($u) {
    $u->update(['system_role' => 'super_admin']);
    echo "Updated system_role to super_admin";
} else {
    echo "User not found";
}
