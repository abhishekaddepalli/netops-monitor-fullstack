<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('organizations', function (Blueprint $table) {
            $table->id();
            $table->string('uuid', 36)->unique();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('billing_email')->nullable();
            $table->string('plan')->default('free'); // free | starter | professional | enterprise
            $table->unsignedInteger('monitor_limit')->default(10);
            $table->unsignedInteger('team_member_limit')->default(2);
            $table->string('timezone')->default('Asia/Kolkata');
            $table->boolean('is_active')->default(true);
            $table->boolean('is_suspended')->default(false);
            $table->text('suspension_reason')->nullable();

            // White-label
            $table->boolean('white_label_enabled')->default(false);
            $table->string('white_label_domain')->nullable()->unique();
            $table->string('white_label_logo_path')->nullable();
            $table->string('white_label_favicon_path')->nullable();
            $table->string('white_label_primary_color', 7)->nullable();
            $table->string('white_label_sender_email')->nullable();
            $table->string('white_label_sender_name')->nullable();

            $table->timestamp('trial_ends_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['is_active', 'is_suspended']);
            $table->index('plan');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organizations');
    }
};
