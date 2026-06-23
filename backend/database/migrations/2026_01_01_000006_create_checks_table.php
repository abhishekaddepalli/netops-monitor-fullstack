<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('checks', function (Blueprint $table) {
            // Bigint PK: this table grows fast (every monitor x every interval).
            $table->id();
            $table->foreignId('monitor_id')->constrained()->cascadeOnDelete();
            $table->foreignId('monitoring_node_id')->nullable()->constrained()->nullOnDelete();

            $table->enum('result', ['up', 'down', 'degraded'])->index();
            $table->unsignedInteger('response_time_ms')->nullable();
            $table->unsignedSmallInteger('status_code')->nullable(); // HTTP status, or null for non-http
            $table->string('error_message', 500)->nullable();

            // Compact snapshot, not full body — avoid bloating this table.
            // Full headers/body snapshot on failure only, capped, stored here.
            $table->json('details')->nullable(); // {headers_sample, body_snippet (first 500 chars), ssl_expiry_days, packet_loss_pct, latency_min/max/jitter...}

            $table->timestamp('checked_at')->index();
            $table->timestamps();

            // Composite index: this is the hot path query — "give me checks for monitor X in time range"
            $table->index(['monitor_id', 'checked_at']);
            $table->index(['monitor_id', 'result', 'checked_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('checks');
    }
};
