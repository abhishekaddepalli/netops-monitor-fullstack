<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('discovery_jobs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('seed_ip');
            $table->string('snmp_version')->default('2c');
            $table->string('community')->nullable();
            $table->string('user')->nullable();
            $table->string('auth_pass')->nullable();
            $table->string('priv_pass')->nullable();
            
            $table->boolean('is_active')->default(true);
            $table->integer('interval_minutes')->default(15);
            $table->timestamp('last_run_at')->nullable();
            
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('discovery_jobs');
    }
};
