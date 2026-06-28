<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('billing_plans', function (Blueprint $table) {
            $table->json('allowed_alert_channels')->nullable();
        });
    }

    public function down()
    {
        Schema::table('billing_plans', function (Blueprint $table) {
            $table->dropColumn('allowed_alert_channels');
        });
    }
};
