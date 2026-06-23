<?php

namespace Database\Factories;

use App\Models\Monitor;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;

class MonitorFactory extends Factory
{
    protected $model = Monitor::class;

    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'name' => $this->faker->domainName(),
            'type' => 'http',
            'target' => 'https://'.$this->faker->domainName(),
            'check_interval_seconds' => 60,
            'timeout_seconds' => 30,
            'confirmation_failures' => 3,
            'confirmation_successes' => 2,
            'status' => 'pending',
            'next_check_at' => now(),
        ];
    }
}
