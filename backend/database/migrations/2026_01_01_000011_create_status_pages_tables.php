<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('status_pages', function (Blueprint $table) {
            $table->id();
            $table->string('uuid', 36)->unique();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();

            $table->string('name');
            $table->string('slug')->unique(); // netopsmonitor.in/status/{slug}
            $table->string('custom_domain')->nullable()->unique(); // status.company.com

            $table->string('logo_path')->nullable();
            $table->string('favicon_path')->nullable();
            $table->string('primary_color', 7)->default('#2E4FA3');
            $table->string('support_url')->nullable();

            $table->boolean('show_uptime_history')->default(true);
            $table->unsignedInteger('uptime_history_days')->default(90);
            $table->boolean('is_password_protected')->default(false);
            $table->string('password_hash')->nullable();
            $table->boolean('is_published')->default(true);

            $table->timestamps();

            $table->index('organization_id');
        });

        Schema::create('status_page_components', function (Blueprint $table) {
            $table->id();
            $table->foreignId('status_page_id')->constrained()->cascadeOnDelete();
            $table->foreignId('monitor_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name'); // display name, e.g. "Payment Processing" — may differ from monitor name
            $table->string('group_name')->nullable(); // for grouping components under a header
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index('status_page_id');
        });

        Schema::create('status_page_maintenance', function (Blueprint $table) {
            $table->id();
            $table->foreignId('status_page_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->timestamp('starts_at');
            $table->timestamp('ends_at');
            $table->json('affected_component_ids')->nullable();
            $table->timestamps();

            $table->index(['status_page_id', 'starts_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('status_page_maintenance');
        Schema::dropIfExists('status_page_components');
        Schema::dropIfExists('status_pages');
    }
};
