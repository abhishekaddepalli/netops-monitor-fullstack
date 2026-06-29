<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('network_maps', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id')->index();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('background_image')->nullable();
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
        });

        Schema::create('network_map_nodes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('network_map_id')->index();
            $table->uuid('monitor_id')->nullable()->index(); // If null, it's just a visual/text node
            $table->string('label')->nullable();
            $table->float('x_pos')->default(0);
            $table->float('y_pos')->default(0);
            $table->string('icon_type')->default('server'); // router, switch, server, cloud, etc.
            $table->timestamps();

            $table->foreign('network_map_id')->references('id')->on('network_maps')->onDelete('cascade');
            $table->foreign('monitor_id')->references('id')->on('monitors')->onDelete('set null');
        });

        Schema::create('network_map_links', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('network_map_id')->index();
            $table->uuid('source_node_id')->index();
            $table->uuid('target_node_id')->index();
            $table->uuid('monitor_id')->nullable()->index(); // SNMP monitor for link status/bandwidth
            $table->string('label')->nullable();
            $table->string('interface_name')->nullable(); // Which interface on the SNMP monitor
            $table->string('color')->default('#94a3b8'); // hex color
            $table->string('style')->default('solid'); // solid, dashed, animated
            $table->timestamps();

            $table->foreign('network_map_id')->references('id')->on('network_maps')->onDelete('cascade');
            $table->foreign('source_node_id')->references('id')->on('network_map_nodes')->onDelete('cascade');
            $table->foreign('target_node_id')->references('id')->on('network_map_nodes')->onDelete('cascade');
            $table->foreign('monitor_id')->references('id')->on('monitors')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('network_map_links');
        Schema::dropIfExists('network_map_nodes');
        Schema::dropIfExists('network_maps');
    }
};
