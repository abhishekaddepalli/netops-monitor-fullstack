<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('alert_channels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('name'); // user-facing label, e.g. "On-call Telegram"
            $table->enum('type', [
                'email', 'sms', 'whatsapp', 'telegram', 'slack',
                'discord', 'teams', 'webhook', 'push',
            ]);
            // type-specific: {to_email} | {phone} | {chat_id, bot_token_ref} | {webhook_url} | {channel_id}...
            $table->json('config');
            $table->boolean('is_active')->default(true);
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'type']);
        });

        Schema::create('escalation_policies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->boolean('is_default')->default(false);
            $table->timestamps();

            $table->index('organization_id');
        });

        // Ordered steps within a policy. Level 1 fires immediately on incident creation,
        // Level 2+ fire if unacknowledged after delay_minutes.
        Schema::create('escalation_steps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('escalation_policy_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('level'); // 1, 2, 3...
            $table->unsignedInteger('delay_minutes')->default(0); // minutes after previous level if unacked
            $table->foreignId('alert_channel_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->index(['escalation_policy_id', 'level']);
        });

        // Attach a policy to a monitor (falls back to org default if null)
        Schema::table('monitors', function (Blueprint $table) {
            $table->foreignId('escalation_policy_id')->nullable()
                ->after('team_id')->constrained()->nullOnDelete();
        });

        Schema::create('alert_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('incident_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('monitor_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('alert_channel_id')->nullable()->constrained()->nullOnDelete();

            $table->enum('type', [
                'email', 'sms', 'whatsapp', 'telegram', 'slack',
                'discord', 'teams', 'webhook', 'push',
            ]);
            $table->enum('event', ['down', 'up', 'ssl_expiring', 'domain_expiring', 'heartbeat_missed', 'degraded']);
            $table->unsignedInteger('escalation_level')->nullable();
            $table->enum('status', ['queued', 'sent', 'failed'])->default('queued');
            $table->text('failure_reason')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'created_at']);
            $table->index('incident_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alert_logs');
        Schema::table('monitors', function (Blueprint $table) {
            $table->dropConstrainedForeignId('escalation_policy_id');
        });
        Schema::dropIfExists('escalation_steps');
        Schema::dropIfExists('escalation_policies');
        Schema::dropIfExists('alert_channels');
    }
};
