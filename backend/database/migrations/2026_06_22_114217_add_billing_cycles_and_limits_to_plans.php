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
        Schema::table('plans', function (Blueprint $table) {
            $table->unsignedInteger('price_inr_half_yearly')->default(0)->after('price_usd_monthly');
            $table->unsignedInteger('price_inr_yearly')->default(0)->after('price_inr_half_yearly');
            $table->unsignedInteger('price_inr_daily')->default(0)->after('price_inr_yearly');
            
            $table->integer('alert_limit_monthly')->default(-1)->after('price_inr_daily'); // -1 = unlimited
            $table->integer('api_request_limit_monthly')->default(-1)->after('alert_limit_monthly');
            $table->integer('integration_limit')->default(-1)->after('api_request_limit_monthly');
        });

        Schema::table('subscriptions', function (Blueprint $table) {
            $table->enum('billing_cycle', ['daily', 'monthly', 'half_yearly', 'yearly'])->default('monthly')->after('plan_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropColumn('billing_cycle');
        });

        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn([
                'price_inr_half_yearly',
                'price_inr_yearly',
                'price_inr_daily',
                'alert_limit_monthly',
                'api_request_limit_monthly',
                'integration_limit',
            ]);
        });
    }
};
