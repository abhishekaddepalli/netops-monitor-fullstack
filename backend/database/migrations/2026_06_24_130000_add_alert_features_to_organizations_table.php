<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->boolean('alert_email_enabled')->default(true)->after('white_label_sender_name');
            $table->boolean('alert_sms_enabled')->default(false)->after('alert_email_enabled');
            $table->boolean('alert_webhook_enabled')->default(false)->after('alert_sms_enabled');
            $table->boolean('alert_slack_enabled')->default(false)->after('alert_webhook_enabled');
            $table->boolean('alert_telegram_enabled')->default(false)->after('alert_slack_enabled');
        });
    }

    public function down(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->dropColumn([
                'alert_email_enabled',
                'alert_sms_enabled',
                'alert_webhook_enabled',
                'alert_slack_enabled',
                'alert_telegram_enabled'
            ]);
        });
    }
};
