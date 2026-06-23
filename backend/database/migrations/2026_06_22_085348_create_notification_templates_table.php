<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('notification_templates', function (Blueprint $table) {
            $table->id();
            $table->string('channel_type'); // e.g., email, sms, telegram, slack
            $table->string('event_type'); // 'down' or 'up'
            $table->text('content'); // The template content (text/markdown/html)
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            // Only one template per channel and event type
            $table->unique(['channel_type', 'event_type']);
        });

        $defaultTemplates = [
            ['channel_type' => 'sms', 'event_type' => 'down', 'content' => "🚨 ALERT: {{monitor.name}} is DOWN.\nError: {{incident.error}}\nTime: {{time}}"],
            ['channel_type' => 'sms', 'event_type' => 'up', 'content' => "✅ RESOLVED: {{monitor.name}} is back UP.\nTime: {{time}}"],
            ['channel_type' => 'whatsapp', 'event_type' => 'down', 'content' => "🚨 *ALERT: {{monitor.name}} is DOWN*\n*URL:* {{monitor.url}}\n*Error:* {{incident.error}}\n*Time:* {{time}}"],
            ['channel_type' => 'whatsapp', 'event_type' => 'up', 'content' => "✅ *RESOLVED: {{monitor.name}} is back UP*\n*URL:* {{monitor.url}}\n*Time:* {{time}}"],
            ['channel_type' => 'telegram', 'event_type' => 'down', 'content' => "🚨 <b>ALERT: {{monitor.name}} is DOWN</b>\nURL: {{monitor.url}}\nError: <code>{{incident.error}}</code>\nTime: {{time}}"],
            ['channel_type' => 'telegram', 'event_type' => 'up', 'content' => "✅ <b>RESOLVED: {{monitor.name}} is back UP</b>\nURL: {{monitor.url}}\nTime: {{time}}"],
            ['channel_type' => 'slack', 'event_type' => 'down', 'content' => "🚨 *ALERT: {{monitor.name}} is DOWN*\n*URL:* {{monitor.url}}\n*Error:* `{{incident.error}}`\n*Time:* {{time}}"],
            ['channel_type' => 'slack', 'event_type' => 'up', 'content' => "✅ *RESOLVED: {{monitor.name}} is back UP*\n*URL:* {{monitor.url}}\n*Time:* {{time}}"],
            ['channel_type' => 'discord', 'event_type' => 'down', 'content' => "🚨 **ALERT: {{monitor.name}} is DOWN**\n**URL:** {{monitor.url}}\n**Error:** `{{incident.error}}`\n**Time:** {{time}}"],
            ['channel_type' => 'discord', 'event_type' => 'up', 'content' => "✅ **RESOLVED: {{monitor.name}} is back UP**\n**URL:** {{monitor.url}}\n**Time:** {{time}}"],
            ['channel_type' => 'teams', 'event_type' => 'down', 'content' => "🚨 **ALERT: {{monitor.name}} is DOWN**\n\n**URL:** {{monitor.url}}\n\n**Error:** `{{incident.error}}`\n\n**Time:** {{time}}"],
            ['channel_type' => 'teams', 'event_type' => 'up', 'content' => "✅ **RESOLVED: {{monitor.name}} is back UP**\n\n**URL:** {{monitor.url}}\n\n**Time:** {{time}}"],
            ['channel_type' => 'email', 'event_type' => 'down', 'content' => "<h2>🚨 Monitor Down: {{monitor.name}}</h2><p><b>URL:</b> <a href=\"{{monitor.url}}\">{{monitor.url}}</a></p><p><b>Error:</b> {{incident.error}}</p><p><b>Time:</b> {{time}}</p>"],
            ['channel_type' => 'email', 'event_type' => 'up', 'content' => "<h2>✅ Service Restored: {{monitor.name}}</h2><p><b>URL:</b> <a href=\"{{monitor.url}}\">{{monitor.url}}</a></p><p><b>Time:</b> {{time}}</p>"],
        ];

        foreach ($defaultTemplates as $template) {
            \Illuminate\Support\Facades\DB::table('notification_templates')->insert(array_merge($template, [
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notification_templates');
    }
};
