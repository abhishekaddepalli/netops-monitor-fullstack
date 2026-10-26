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
        if (Schema::hasTable('plans')) {
            Schema::table('plans', function (Blueprint $table) {
                // Change limits to signed integers to support -1 (unlimited)
                $table->integer('monitor_limit')->default(10)->change();
                $table->integer('team_member_limit')->default(2)->change();
                $table->integer('status_page_limit')->default(1)->change();
                $table->integer('check_interval_min_seconds')->default(60)->change();

                // Ensure pricing columns exist and have proper decimal/integer defaults
                if (!Schema::hasColumn('plans', 'price_inr_daily')) {
                    $table->decimal('price_inr_daily', 10, 2)->default(0)->after('price_inr_monthly');
                }
                if (!Schema::hasColumn('plans', 'price_inr_half_yearly')) {
                    $table->decimal('price_inr_half_yearly', 10, 2)->default(0)->after('price_inr_daily');
                }
                if (!Schema::hasColumn('plans', 'price_inr_yearly')) {
                    $table->decimal('price_inr_yearly', 10, 2)->default(0)->after('price_inr_half_yearly');
                }
                if (!Schema::hasColumn('plans', 'alert_limit_monthly')) {
                    $table->integer('alert_limit_monthly')->default(-1)->after('price_inr_yearly');
                }
                if (!Schema::hasColumn('plans', 'api_request_limit_monthly')) {
                    $table->integer('api_request_limit_monthly')->default(-1)->after('alert_limit_monthly');
                }
                if (!Schema::hasColumn('plans', 'integration_limit')) {
                    $table->integer('integration_limit')->default(-1)->after('api_request_limit_monthly');
                }
                if (!Schema::hasColumn('plans', 'is_public')) {
                    $table->boolean('is_public')->default(true)->after('is_active');
                }
            });
        }

        if (Schema::hasTable('organizations')) {
            Schema::table('organizations', function (Blueprint $table) {
                // Change limits to signed integers to support -1 (unlimited)
                $table->integer('monitor_limit')->default(10)->change();
                $table->integer('team_member_limit')->default(2)->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('plans')) {
            Schema::table('plans', function (Blueprint $table) {
                $table->unsignedInteger('monitor_limit')->default(10)->change();
                $table->unsignedInteger('team_member_limit')->default(2)->change();
                $table->unsignedInteger('status_page_limit')->default(1)->change();
            });
        }

        if (Schema::hasTable('organizations')) {
            Schema::table('organizations', function (Blueprint $table) {
                $table->unsignedInteger('monitor_limit')->default(10)->change();
                $table->unsignedInteger('team_member_limit')->default(2)->change();
            });
        }
    }
};
