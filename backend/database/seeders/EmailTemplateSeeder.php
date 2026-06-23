<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class EmailTemplateSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $templates = [
            ['channel_type' => 'email', 'event_type' => 'down', 'content' => "<h2>🚨 Monitor Down: {{monitor.name}}</h2><p><b>URL:</b> <a href=\"{{monitor.url}}\">{{monitor.url}}</a></p><p><b>Error:</b> {{incident.error}}</p><p><b>Time:</b> {{time}}</p>"],
            ['channel_type' => 'email', 'event_type' => 'up', 'content' => "<h2>✅ Service Restored: {{monitor.name}}</h2><p><b>URL:</b> <a href=\"{{monitor.url}}\">{{monitor.url}}</a></p><p><b>Time:</b> {{time}}</p>"],
        ];

        foreach ($templates as $template) {
            \Illuminate\Support\Facades\DB::table('notification_templates')->insertOrIgnore(array_merge($template, [
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }
    }
}
