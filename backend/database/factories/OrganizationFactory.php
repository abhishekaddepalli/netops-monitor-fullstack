<?php

namespace Database\Factories;

use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;

class OrganizationFactory extends Factory
{
    protected $model = Organization::class;

    public function definition(): array
    {
        return [
            'name' => $this->faker->company(),
            'plan' => 'free',
            'monitor_limit' => 10,
            'team_member_limit' => 2,
            'timezone' => 'Asia/Kolkata',
            'is_active' => true,
        ];
    }
}
