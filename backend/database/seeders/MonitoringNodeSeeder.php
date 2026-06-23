<?php

namespace Database\Seeders;

use App\Models\MonitoringNode;
use Illuminate\Database\Seeder;

class MonitoringNodeSeeder extends Seeder
{
    public function run(): void
    {
        $nodes = [
            ['key' => 'mumbai-1', 'name' => 'Mumbai, India', 'region_code' => 'BOM', 'latitude' => 19.0760, 'longitude' => 72.8777],
            ['key' => 'hyderabad-1', 'name' => 'Hyderabad, India', 'region_code' => 'HYD', 'latitude' => 17.3850, 'longitude' => 78.4867],
            ['key' => 'singapore-1', 'name' => 'Singapore', 'region_code' => 'SIN', 'latitude' => 1.3521, 'longitude' => 103.8198],
            ['key' => 'london-1', 'name' => 'London, UK', 'region_code' => 'LHR', 'latitude' => 51.5074, 'longitude' => -0.1278],
            ['key' => 'frankfurt-1', 'name' => 'Frankfurt, Germany', 'region_code' => 'FRA', 'latitude' => 50.1109, 'longitude' => 8.6821],
            ['key' => 'newyork-1', 'name' => 'New York, USA', 'region_code' => 'NYC', 'latitude' => 40.7128, 'longitude' => -74.0060],
        ];

        foreach ($nodes as $node) {
            MonitoringNode::updateOrCreate(['key' => $node['key']], [
                ...$node,
                'provider' => 'bare-metal',
                'is_active' => true,
                'last_heartbeat_at' => now(),
            ]);
        }
    }
}
