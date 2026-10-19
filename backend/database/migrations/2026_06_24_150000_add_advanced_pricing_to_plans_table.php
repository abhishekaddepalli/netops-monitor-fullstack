<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('plans')) {
            Schema::table('plans', function (Blueprint $table) {
                if (!Schema::hasColumn('plans', 'price_inr_daily')) {
                    $table->unsignedInteger('price_inr_daily')->default(0)->after('price_inr_monthly');
                }
                if (!Schema::hasColumn('plans', 'price_inr_half_yearly')) {
                    $table->unsignedInteger('price_inr_half_yearly')->default(0)->after('price_inr_daily');
                }
                if (!Schema::hasColumn('plans', 'price_inr_yearly')) {
                    $table->unsignedInteger('price_inr_yearly')->default(0)->after('price_inr_half_yearly');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('plans')) {
            Schema::table('plans', function (Blueprint $table) {
                $columns = [];
                if (Schema::hasColumn('plans', 'price_inr_daily')) $columns[] = 'price_inr_daily';
                if (Schema::hasColumn('plans', 'price_inr_half_yearly')) $columns[] = 'price_inr_half_yearly';
                if (Schema::hasColumn('plans', 'price_inr_yearly')) $columns[] = 'price_inr_yearly';
                if (!empty($columns)) {
                    $table->dropColumn($columns);
                }
            });
        }
    }
};
