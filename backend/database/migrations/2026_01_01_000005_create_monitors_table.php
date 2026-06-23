<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('monitors', function (Blueprint $table) {
            $table->id();
            $table->string('uuid', 36)->unique();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('team_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();

            $table->string('name');
            $table->enum('type', [
                'http', 'ping', 'tcp_port', 'ssl', 'dns', 'heartbeat', 'api',
                'snmp', 'mikrotik', 'radius',
            ])->index();

            // The thing being checked. For http: URL. For ping/tcp: host. For dns: domain.
            $table->string('target', 2048);
            $table->unsignedInteger('port')->nullable(); // for tcp_port / custom services

            // Type-specific configuration. See app/Services/Monitors/*Checker.php for shape per type.
            // e.g. http: {method, expected_status, keyword, keyword_negative, headers, auth, follow_redirects, verify_ssl, user_agent, body_contains}
            // e.g. tcp_port: {service} (ssh|ftp|smtp|pop3|imap|https|rdp|mysql|postgresql|mongodb|mikrotik_api|winbox|radius|dns|custom)
            // e.g. heartbeat: {grace_period_seconds}
            // e.g. dns: {record_type, expected_values}
            // e.g. api: {method, json_path, expected_value, body, headers}
            $table->json('config')->nullable();

            $table->unsignedInteger('check_interval_seconds')->default(60); // 30,60,180,300,600,900
            $table->unsignedInteger('timeout_seconds')->default(30);
            $table->unsignedInteger('confirmation_failures')->default(3); // failures before DOWN incident
            $table->unsignedInteger('confirmation_successes')->default(2); // successes before auto-resolve

            $table->enum('status', ['up', 'down', 'degraded', 'paused', 'pending'])->default('pending')->index();
            $table->timestamp('status_since')->nullable();
            $table->unsignedInteger('consecutive_failures')->default(0);
            $table->unsignedInteger('consecutive_successes')->default(0);

            $table->timestamp('last_checked_at')->nullable()->index();
            $table->timestamp('next_check_at')->nullable()->index();
            $table->unsignedInteger('last_response_time_ms')->nullable();

            // Heartbeat-specific: unique inbound ping URL slug
            $table->string('heartbeat_token', 64)->nullable()->unique();
            $table->timestamp('heartbeat_last_ping_at')->nullable();

            $table->boolean('is_paused')->default(false);
            $table->boolean('maintenance_mode')->default(false);
            $table->timestamp('maintenance_until')->nullable();

            $table->json('tags')->nullable();
            $table->unsignedInteger('sort_order')->default(0);

            $table->timestamps();
            $table->softDeletes();

            $table->index(['organization_id', 'status']);
            $table->index(['organization_id', 'type']);
            $table->index(['is_paused', 'next_check_at']);
        });
        // Pivot: which nodes a given monitor should be checked from.
        Schema::create('monitor_node', function (Blueprint $table) {
            $table->id();
            $table->foreignId('monitor_id')->constrained()->cascadeOnDelete();
            $table->foreignId('monitoring_node_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['monitor_id', 'monitoring_node_id'], 'monitor_node_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('monitor_node');
        Schema::dropIfExists('monitors');
    }
};
