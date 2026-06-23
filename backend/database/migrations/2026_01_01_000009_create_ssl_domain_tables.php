<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ssl_certificates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('monitor_id')->constrained()->cascadeOnDelete();

            $table->string('issuer')->nullable();
            $table->string('subject')->nullable();
            $table->string('signature_algorithm')->nullable();
            $table->text('serial_number')->nullable();
            $table->json('certificate_chain')->nullable(); // [{subject, issuer, valid_to}, ...]

            $table->timestamp('valid_from')->nullable();
            $table->timestamp('valid_to')->nullable()->index();
            $table->integer('days_remaining')->nullable();
            $table->boolean('is_valid')->default(true);
            $table->json('alert_thresholds_sent')->nullable(); // [60,30,15,7,3,1] already-notified days

            $table->timestamp('checked_at')->nullable();
            $table->timestamps();

            $table->unique('monitor_id');
        });

        Schema::create('domain_expirations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('monitor_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();

            $table->string('domain')->index();
            $table->string('registrar')->nullable();
            $table->timestamp('registered_at')->nullable();
            $table->timestamp('expires_at')->nullable()->index();
            $table->integer('days_remaining')->nullable();
            $table->json('alert_thresholds_sent')->nullable();

            $table->timestamp('checked_at')->nullable();
            $table->timestamps();

            $table->unique(['organization_id', 'domain']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('domain_expirations');
        Schema::dropIfExists('ssl_certificates');
    }
};
