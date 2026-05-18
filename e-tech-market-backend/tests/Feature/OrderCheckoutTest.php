<?php

namespace Tests\Feature;

use App\Models\AdminSetting;
use App\Models\Category;
use App\Models\Coupon;
use App\Models\CouponUsage;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Role;
use App\Models\ShippingMethod;
use App\Models\ShippingZone;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Illuminate\Support\Carbon;

class OrderCheckoutTest extends TestCase
{
    use DatabaseTransactions;

    private User $customerUser;
    private Category $category;
    private Product $product;
    private ProductVariant $variant;

    protected function setUp(): void
    {
        parent::setUp();

        $role = Role::query()->firstOrCreate(
            ['slug' => 'customer'],
            ['name' => 'Customer', 'description' => 'Customer']
        );

        $this->customerUser = User::factory()->create(['is_active' => true]);
        $this->customerUser->roles()->attach($role->id);

        $this->category = Category::create([
            'name' => 'Test Category',
            'slug' => 'test-category-slug',
            'is_active' => true,
        ]);

        $this->product = Product::create([
            'category_id' => $this->category->id,
            'name' => 'Test Product',
            'slug' => 'test-product-slug',
            'brand' => 'TestBrand',
            'is_active' => true,
        ]);

        $this->variant = ProductVariant::create([
            'product_id' => $this->product->id,
            'variant_name' => 'Test Variant 256GB',
            'sku' => 'TEST-SKU-12345',
            'price' => 30000000,
            'stock_quantity' => 10,
            'is_active' => true,
        ]);
    }

    public function test_checkout_successfully_with_cod(): void
    {
        Sanctum::actingAs($this->customerUser);

        $response = $this->postJson('/api/orders/from-items', [
            'shipping_name' => 'Do Hoang',
            'shipping_phone' => '0987654321',
            'shipping_address_line' => '123 Nguyen Trai, Q.5',
            'payment_method' => 'cod',
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'variant_id' => $this->variant->id,
                    'quantity' => 2,
                ]
            ]
        ]);

        $response->assertCreated();

        $orderId = $response->json('id');
        $this->assertDatabaseHas('orders', [
            'id' => $orderId,
            'user_id' => $this->customerUser->id,
            'status' => 'pending',
            'payment_status' => 'pending',
            'total_amount' => 60000000,
        ]);

        $this->assertDatabaseHas('order_items', [
            'order_id' => $orderId,
            'product_id' => $this->product->id,
            'variant_id' => $this->variant->id,
            'quantity' => 2,
            'unit_price' => 30000000,
        ]);

        $this->assertDatabaseHas('payments', [
            'order_id' => $orderId,
            'method' => 'cod',
            'status' => 'pending',
            'amount' => 60000000,
        ]);

        // Assert variant stock decreased from 10 to 8
        $this->assertEquals(8, $this->variant->fresh()->stock_quantity);
    }

    public function test_checkout_fails_when_out_of_stock(): void
    {
        Sanctum::actingAs($this->customerUser);

        $response = $this->postJson('/api/orders/from-items', [
            'shipping_name' => 'Do Hoang',
            'shipping_phone' => '0987654321',
            'shipping_address_line' => '123 Nguyen Trai, Q.5',
            'payment_method' => 'cod',
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'variant_id' => $this->variant->id,
                    'quantity' => 15, // Out of stock (only 10 available)
                ]
            ]
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['items']);
            
        // Check that stock is intact
        $this->assertEquals(10, $this->variant->fresh()->stock_quantity);
    }

    public function test_shipping_fee_free_under_policy(): void
    {
        Sanctum::actingAs($this->customerUser);

        // Add shipping method and shipping zone
        $method = ShippingMethod::create([
            'name' => 'Standard',
            'base_fee' => 20000,
            'is_active' => true,
        ]);

        $zone = ShippingZone::create([
            'name' => 'Hanoi',
            'fee' => 15000,
            'is_active' => true,
        ]);

        // Set free shipping policy if subtotal >= 10,000,000
        AdminSetting::query()->updateOrCreate(
            ['key' => 'shipping_policy'],
            [
                'value' => [
                    'free_shipping_min' => 10000000,
                    'apply_global' => true,
                ]
            ]
        );

        $response = $this->postJson('/api/orders/from-items', [
            'shipping_name' => 'Do Hoang',
            'shipping_phone' => '0987654321',
            'shipping_address_line' => '123 Nguyen Trai, Q.5',
            'shipping_method_id' => $method->id,
            'shipping_zone_id' => $zone->id,
            'payment_method' => 'cod',
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'variant_id' => $this->variant->id,
                    'quantity' => 1, // Subtotal = 30,000,000 >= 10,000,000
                ]
            ]
        ]);

        $response->assertCreated()
            ->assertJsonPath('shipping_fee', '0.00') // Should be free
            ->assertJsonPath('total_amount', '30000000.00');
    }

    public function test_checkout_with_coupon_code(): void
    {
        Sanctum::actingAs($this->customerUser);

        $coupon = Coupon::create([
            'code' => 'DISCOUNT500K',
            'coupon_type' => 'fixed',
            'value' => 500000,
            'min_order_amount' => 5000000,
            'is_active' => true,
            'start_at' => Carbon::now()->subDay(),
            'end_at' => Carbon::now()->addDay(),
        ]);

        $response = $this->postJson('/api/orders/from-items', [
            'shipping_name' => 'Do Hoang',
            'shipping_phone' => '0987654321',
            'shipping_address_line' => '123 Nguyen Trai, Q.5',
            'coupon_code' => 'DISCOUNT500K',
            'payment_method' => 'cod',
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'variant_id' => $this->variant->id,
                    'quantity' => 1,
                ]
            ]
        ]);

        $response->assertCreated();
        $orderId = $response->json('id');

        $this->assertDatabaseHas('orders', [
            'id' => $orderId,
            'coupon_id' => $coupon->id,
            'discount_amount' => 500000,
            'total_amount' => 29500000, // 30M - 500K
        ]);

        $this->assertDatabaseHas('coupon_usage', [
            'coupon_id' => $coupon->id,
            'user_id' => $this->customerUser->id,
            'order_id' => $orderId,
            'discount_amount' => 500000,
        ]);
    }
}
