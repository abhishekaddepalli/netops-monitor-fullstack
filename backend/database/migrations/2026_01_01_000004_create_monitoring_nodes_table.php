<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('monitoring_nodes', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique(); // e.g. mumbai-1
            $table->string('name'); // e.g. Mumbai, India
            $table->string('region_code', 10); // ISO-ish short code: BOM, HYD, SIN, LHR, FRA, NYC
            $table->decimal('latitude', 9, 6)->nullable();
            $table->decimal('longitude', 9, 6)->nullable();
            $table->string('provider')->nullable(); // e.g. AWS, DigitalOcean, bare-metal
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_heartbeat_at')->nullable();
            $table->unsignedInteger('queue_depth')->default(0);
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['is_active', 'last_heartbeat_at']);
        });

    }

    public function down(): void
    {
        Schema::dropIfExists('monitoring_nodes');
    }
};
