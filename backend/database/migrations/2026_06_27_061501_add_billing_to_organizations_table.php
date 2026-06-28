<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->foreignId('billing_plan_id')->nullable()->constrained('billing_plans')->nullOnDelete();
            $table->json('custom_features')->nullable(); // overrides specific limits
        });
    }

    public function down()
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->dropForeign(['billing_plan_id']);
            $table->dropColumn(['billing_plan_id', 'custom_features']);
        });
    }
};
