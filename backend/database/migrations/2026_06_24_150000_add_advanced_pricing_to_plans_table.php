<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->unsignedInteger('price_inr_daily')->default(0)->after('price_inr_monthly');
            $table->unsignedInteger('price_inr_half_yearly')->default(0)->after('price_inr_daily');
            $table->unsignedInteger('price_inr_yearly')->default(0)->after('price_inr_half_yearly');
        });
    }

    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn(['price_inr_daily', 'price_inr_half_yearly', 'price_inr_yearly']);
        });
    }
};
