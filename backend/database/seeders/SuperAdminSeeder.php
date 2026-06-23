<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@netopsmonitor.in'],
            [
                'name' => 'Platform Super Admin',
                'password' => Hash::make('ChangeMe!2026'), // CHANGE IMMEDIATELY after first login
                'system_role' => 'super_admin',
                'organization_id' => null,
                'email_verified_at' => now(),
            ]
        );

        $this->command->warn('Super Admin created: admin@netopsmonitor.in / ChangeMe!2026 — change this password immediately.');
    }
}
