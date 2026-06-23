<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Pre-aggregated rollups, written by App\Jobs\RollupCheckStatsJob (hourly).
     * Dashboards, SLA reports, and 90-day status-page bars read from here,
     * NOT from raw `checks`, once data is older than ~48h. This is what
     * makes the platform viable at 100,000+ monitors — without it, every
     * uptime % calculation would scan millions of check rows.
     */
    public function up(): void
    {
        Schema::create('check_rollups_hourly', function (Blueprint $table) {
            $table->id();
            $table->foreignId('monitor_id')->constrained()->cascadeOnDelete();
            $table->timestamp('hour_bucket')->index(); // truncated to the hour

            $table->unsignedInteger('total_checks')->default(0);
            $table->unsignedInteger('up_checks')->default(0);
            $table->unsignedInteger('down_checks')->default(0);
            $table->unsignedInteger('degraded_checks')->default(0);

            $table->unsignedInteger('avg_response_time_ms')->nullable();
            $table->unsignedInteger('min_response_time_ms')->nullable();
            $table->unsignedInteger('max_response_time_ms')->nullable();
            $table->decimal('uptime_pct', 6, 3)->default(100); // computed: up / total * 100

            $table->timestamps();

            $table->unique(['monitor_id', 'hour_bucket']);
        });

        Schema::create('check_rollups_daily', function (Blueprint $table) {
            $table->id();
            $table->foreignId('monitor_id')->constrained()->cascadeOnDelete();
            $table->date('day_bucket')->index();

            $table->unsignedInteger('total_checks')->default(0);
            $table->unsignedInteger('up_checks')->default(0);
            $table->unsignedInteger('down_checks')->default(0);
            $table->unsignedInteger('degraded_checks')->default(0);
            $table->unsignedInteger('avg_response_time_ms')->nullable();
            $table->decimal('uptime_pct', 6, 3)->default(100);
            $table->unsignedInteger('downtime_seconds')->default(0);

            $table->timestamps();

            $table->unique(['monitor_id', 'day_bucket']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('check_rollups_daily');
        Schema::dropIfExists('check_rollups_hourly');
    }
};
