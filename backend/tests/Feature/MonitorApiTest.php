<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Smoke tests demonstrating the expected request/response contract for the
 * core monitor endpoints. Run with: php artisan test
 */
class MonitorApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_org_admin_can_create_a_monitor(): void
    {
        $this->seed(\Database\Seeders\PlanSeeder::class);

        $org = Organization::factory()->create(['monitor_limit' => 10]);
        $user = User::factory()->create(['organization_id' => $org->id]);
        $org->users()->attach($user->id, ['role' => 'org_admin', 'joined_at' => now()]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/v1/monitors', [
            'name' => 'Example Website',
            'type' => 'http',
            'target' => 'https://example.com',
            'check_interval_seconds' => 60,
        ]);

        $response->assertCreated();
        $response->assertJsonPath('name', 'Example Website');
        $this->assertDatabaseHas('monitors', ['target' => 'https://example.com', 'organization_id' => $org->id]);
    }

    public function test_user_cannot_see_monitors_from_another_organization(): void
    {
        $orgA = Organization::factory()->create();
        $orgB = Organization::factory()->create();
        $userA = User::factory()->create(['organization_id' => $orgA->id]);
        $orgA->users()->attach($userA->id, ['role' => 'org_admin', 'joined_at' => now()]);

        $monitorB = \App\Models\Monitor::factory()->create(['organization_id' => $orgB->id]);

        $response = $this->actingAs($userA, 'sanctum')->getJson("/api/v1/monitors/{$monitorB->id}");

        $response->assertForbidden();
    }

    public function test_read_only_user_cannot_create_monitors(): void
    {
        $org = Organization::factory()->create();
        $user = User::factory()->create(['organization_id' => $org->id]);
        $org->users()->attach($user->id, ['role' => 'read_only', 'joined_at' => now()]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/v1/monitors', [
            'name' => 'Should Fail', 'type' => 'http', 'target' => 'https://example.com', 'check_interval_seconds' => 60,
        ]);

        $response->assertForbidden();
    }
}
