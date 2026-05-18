<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminAccessTest extends TestCase
{
    use DatabaseTransactions;

    public function test_customer_token_cannot_access_admin_api(): void
    {
        $role = Role::query()->firstOrCreate(
            ['slug' => 'customer'],
            ['name' => 'Customer', 'description' => 'Customer'],
        );
        $user = User::factory()->create(['is_active' => true]);
        $user->roles()->attach($role->id);

        Sanctum::actingAs($user);

        $this->getJson('/api/admin/users')->assertForbidden();
    }
}
