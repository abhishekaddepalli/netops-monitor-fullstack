<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('server_metrics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('monitor_id')->constrained()->cascadeOnDelete();
            $table->decimal('cpu_usage_pct', 5, 2)->nullable();
            $table->decimal('ram_usage_pct', 5, 2)->nullable();
            $table->decimal('disk_usage_pct', 5, 2)->nullable();
            $table->json('interfaces')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('server_metrics');
    }
};
