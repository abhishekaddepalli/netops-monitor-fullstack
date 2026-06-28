<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->boolean('enable_login_alerts')->default(true);
            $table->boolean('enable_weekly_reports')->default(true);
            $table->boolean('enable_monthly_reports')->default(true);
        });
    }

    public function down(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->dropColumn([
                'enable_login_alerts',
                'enable_weekly_reports',
                'enable_monthly_reports',
            ]);
        });
    }
};
