<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('incidents', function (Blueprint $table) {
            $table->id();
            $table->string('uuid', 36)->unique();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('monitor_id')->nullable()->constrained()->nullOnDelete();

            $table->string('title');
            $table->enum('severity', ['critical', 'major', 'minor', 'degraded'])->default('major');
            $table->enum('state', ['investigating', 'identified', 'monitoring', 'resolved'])->default('investigating')->index();
            $table->boolean('is_auto_created')->default(true);

            $table->text('root_cause')->nullable();
            $table->text('resolution_notes')->nullable();

            $table->timestamp('started_at')->index();
            $table->timestamp('acknowledged_at')->nullable();
            $table->foreignId('acknowledged_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();

            // Denormalized for fast MTTR/MTTD reporting without joining incident_updates.
            $table->unsignedInteger('time_to_acknowledge_seconds')->nullable();
            $table->unsignedInteger('time_to_resolve_seconds')->nullable();

            $table->boolean('show_on_status_page')->default(true);
            $table->timestamps();

            $table->index(['organization_id', 'state']);
            $table->index(['monitor_id', 'started_at']);
        });

        Schema::create('incident_updates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('incident_id')->constrained()->cascadeOnDelete();
            $table->foreignId('posted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('state', ['investigating', 'identified', 'monitoring', 'resolved'])->nullable();
            $table->text('message');
            $table->boolean('is_system_generated')->default(false);
            $table->timestamps();

            $table->index('incident_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('incident_updates');
        Schema::dropIfExists('incidents');
    }
};
