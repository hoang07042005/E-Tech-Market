<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class RbacTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        // Create standard system permissions
        Permission::findOrCreate('manage-products');
        Permission::findOrCreate('manage-orders');

        // Create Roles
        Role::findOrCreate('admin');
        Role::findOrCreate('warehouse-staff');
    }

    public function test_admin_role_can_access_all_admin_endpoints(): void
    {
        $adminUser = User::factory()->create();
        $adminUser->assignRole('admin');

        Sanctum::actingAs($adminUser);

        // Access products list
        $response1 = $this->getJson('/api/admin/products');
        $response1->assertOk();

        // Access orders list
        $response2 = $this->getJson('/api/admin/orders');
        $response2->assertOk();
    }

    public function test_warehouse_staff_can_only_access_products_and_blocked_from_orders(): void
    {
        $staffUser = User::factory()->create();
        $staffUser->assignRole('warehouse-staff');

        // Give warehouse-staff role the manage-products permission
        $role = Role::findByName('warehouse-staff');
        $role->givePermissionTo('manage-products');

        Sanctum::actingAs($staffUser);

        // Can access products list
        $response1 = $this->getJson('/api/admin/products');
        $response1->assertOk();

        // Access orders list is blocked
        $response2 = $this->getJson('/api/admin/orders');
        $response2->assertStatus(403);
        $response2->assertJsonPath('message', 'Bạn không có quyền thực hiện hành động này. Yêu cầu quyền: manage-orders.');
    }

    public function test_editor_can_read_products_and_access_news_but_cannot_create_products(): void
    {
        Permission::findOrCreate('manage-blog');
        Role::findOrCreate('editor');
        $role = Role::findByName('editor');
        $role->givePermissionTo('manage-blog');

        $editorUser = User::factory()->create();
        $editorUser->assignRole('editor');

        Sanctum::actingAs($editorUser);

        // 1. Can view products list (read-only GET)
        $response1 = $this->getJson('/api/admin/products');
        $response1->assertOk();

        // 2. Cannot create a product (POST blocked)
        $response2 = $this->postJson('/api/admin/products', [
            'name' => 'New Test Product',
        ]);
        $response2->assertStatus(403);
        $response2->assertJsonPath('message', 'Bạn không có quyền thực hiện hành động này. Yêu cầu quyền: manage-products.');

        // 3. Can access product news endpoint (manage-blog permission mapping)
        // Bypasses middleware 403 check and triggers 404 on non-existing product, which is correct!
        $response3 = $this->getJson('/api/admin/products/9999/news');
        $response3->assertNotFound();
    }

    public function test_regular_customer_is_fully_blocked_from_all_admin_endpoints(): void
    {
        $customerUser = User::factory()->create();

        Sanctum::actingAs($customerUser);

        $response = $this->getJson('/api/admin/products');
        $response->assertStatus(403);
    }
}
