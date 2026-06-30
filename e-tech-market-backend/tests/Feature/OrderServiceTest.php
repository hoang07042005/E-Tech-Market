<?php

namespace Tests\Feature;

use App\Models\Coupon;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Services\OrderService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class OrderServiceTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected OrderService $orderService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->orderService = app(OrderService::class);
        Role::firstOrCreate(['name' => 'customer', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    }

    // ==================== CREATE ORDER TESTS ====================

    public function test_create_order_with_cod_payment()
    {
        $user = User::factory()->create();
        $product = Product::factory()->create(['is_active' => true]);
        $variant = ProductVariant::factory()->create([
            'product_id' => $product->id,
            'is_active' => true,
            'price' => 100000,
            'stock_quantity' => 10
        ]);

        $data = [
            'shipping_name' => 'Test User',
            'shipping_phone' => '0123456789',
            'shipping_address_line' => '123 Test St',
            'payment_method' => 'cod',
            'items' => [
                [
                    'product_id' => $product->id,
                    'variant_id' => $variant->id,
                    'quantity' => 2
                ]
            ]
        ];

        $order = $this->orderService->createOrder($user, $data, $data['items']);

        $this->assertNotNull($order);
        $this->assertEquals('pending', $order->status);
        $this->assertEquals('cod', $order->payment->method);
        $this->assertEquals(200000, $order->subtotal_amount);
        $this->assertEquals(200000, $order->total_amount);

        // Verify stock is deducted
        $variant->refresh();
        $this->assertEquals(8, $variant->stock_quantity);
    }

    public function test_create_order_with_vnpay_payment()
    {
        $user = User::factory()->create();
        $product = Product::factory()->create(['is_active' => true]);
        $variant = ProductVariant::factory()->create([
            'product_id' => $product->id,
            'is_active' => true,
            'price' => 500000,
            'stock_quantity' => 5
        ]);

        $data = [
            'shipping_name' => 'Test User',
            'shipping_phone' => '0123456789',
            'shipping_address_line' => '123 Test St',
            'payment_method' => 'vnpay',
            'items' => [
                [
                    'product_id' => $product->id,
                    'variant_id' => $variant->id,
                    'quantity' => 1
                ]
            ]
        ];

        $order = $this->orderService->createOrder($user, $data, $data['items']);

        $this->assertNotNull($order);
        $this->assertEquals('pending', $order->status);
        $this->assertEquals('vnpay', $order->payment->method);
        $this->assertEquals(500000, $order->total_amount);
    }

    public function test_create_order_with_momo_payment()
    {
        $user = User::factory()->create();
        $product = Product::factory()->create(['is_active' => true]);
        $variant = ProductVariant::factory()->create([
            'product_id' => $product->id,
            'is_active' => true,
            'price' => 300000,
            'stock_quantity' => 3
        ]);

        $data = [
            'shipping_name' => 'Test User',
            'shipping_phone' => '0123456789',
            'shipping_address_line' => '123 Test St',
            'payment_method' => 'momo',
            'items' => [
                [
                    'product_id' => $product->id,
                    'variant_id' => $variant->id,
                    'quantity' => 1
                ]
            ]
        ];

        $order = $this->orderService->createOrder($user, $data, $data['items']);

        $this->assertNotNull($order);
        $this->assertEquals('momo', $order->payment->method);
    }

    public function test_create_order_with_coupon_discount()
    {
        $user = User::factory()->create();
        $coupon = Coupon::factory()->create([
            'coupon_type' => 'percentage',
            'value' => 10,
            'is_active' => true,
        ]);
        $product = Product::factory()->create(['is_active' => true]);
        $variant = ProductVariant::factory()->create([
            'product_id' => $product->id,
            'is_active' => true,
            'price' => 100000,
            'stock_quantity' => 10
        ]);

        $data = [
            'shipping_name' => 'Test User',
            'shipping_phone' => '0123456789',
            'shipping_address_line' => '123 Test St',
            'payment_method' => 'cod',
            'coupon_code' => $coupon->code,
            'items' => [
                [
                    'product_id' => $product->id,
                    'variant_id' => $variant->id,
                    'quantity' => 1
                ]
            ]
        ];

        $order = $this->orderService->createOrder($user, $data, $data['items']);

        $this->assertEquals(10000, $order->discount_amount); // 10% of 100000
        $this->assertEquals(90000, $order->total_amount);
    }

    public function test_create_order_with_points_discount()
    {
        $user = User::factory()->create(['loyalty_points' => 1000]);
        $product = Product::factory()->create(['is_active' => true]);
        $variant = ProductVariant::factory()->create([
            'product_id' => $product->id,
            'is_active' => true,
            'price' => 100000,
            'stock_quantity' => 10
        ]);

        $data = [
            'shipping_name' => 'Test User',
            'shipping_phone' => '0123456789',
            'shipping_address_line' => '123 Test St',
            'payment_method' => 'cod',
            'points_used' => 100,
            'items' => [
                [
                    'product_id' => $product->id,
                    'variant_id' => $variant->id,
                    'quantity' => 1
                ]
            ]
        ];

        $order = $this->orderService->createOrder($user, $data, $data['items']);

        $this->assertEquals(100, $order->points_used);
        $this->assertEquals(90000, $order->total_amount); // 100000 - 10000 (100 points = 10000 VND)
    }

    public function test_create_order_fails_with_insufficient_stock()
    {
        $user = User::factory()->create();
        $product = Product::factory()->create(['is_active' => true]);
        $variant = ProductVariant::factory()->create([
            'product_id' => $product->id,
            'is_active' => true,
            'price' => 100000,
            'stock_quantity' => 2
        ]);

        $data = [
            'shipping_name' => 'Test User',
            'shipping_phone' => '0123456789',
            'shipping_address_line' => '123 Test St',
            'payment_method' => 'cod',
            'items' => [
                [
                    'product_id' => $product->id,
                    'variant_id' => $variant->id,
                    'quantity' => 5 // Request more than available
                ]
            ]
        ];

        $this->expectException(\App\Exceptions\InsufficientStockException::class);

        $this->orderService->createOrder($user, $data, $data['items']);
    }

    public function test_create_order_fails_with_invalid_coupon()
    {
        $user = User::factory()->create();
        $product = Product::factory()->create(['is_active' => true]);
        $variant = ProductVariant::factory()->create([
            'product_id' => $product->id,
            'is_active' => true,
            'price' => 100000,
            'stock_quantity' => 10
        ]);

        $data = [
            'shipping_name' => 'Test User',
            'shipping_phone' => '0123456789',
            'shipping_address_line' => '123 Test St',
            'payment_method' => 'cod',
            'coupon_code' => 'INVALID',
            'items' => [
                [
                    'product_id' => $product->id,
                    'variant_id' => $variant->id,
                    'quantity' => 1
                ]
            ]
        ];

        $this->expectException(\App\Exceptions\InvalidCouponException::class);

        $this->orderService->createOrder($user, $data, $data['items']);
    }

    // ==================== CANCEL ORDER TESTS ====================

    public function test_cancel_pending_order_restores_stock()
    {
        $user = User::factory()->create();
        $product = Product::factory()->create(['is_active' => true]);
        $variant = ProductVariant::factory()->create([
            'product_id' => $product->id,
            'is_active' => true,
            'price' => 100000,
            'stock_quantity' => 10
        ]);

        $order = Order::factory()->for($user)->create([
            'status' => 'pending',
        ]);
        OrderItem::factory()->create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'variant_id' => $variant->id,
            'quantity' => 2,
        ]);

        // Deduct stock first
        $variant->update(['stock_quantity' => 8]);

        $cancelledOrder = $this->orderService->cancelOrder($order, $user);

        $this->assertEquals('cancelled', $cancelledOrder->status);

        $variant->refresh();
        $this->assertEquals(10, $variant->stock_quantity);
    }

    public function test_cannot_cancel_completed_order()
    {
        $user = User::factory()->create();
        $product = Product::factory()->create(['is_active' => true]);
        $variant = ProductVariant::factory()->create([
            'product_id' => $product->id,
            'is_active' => true,
            'price' => 100000,
            'stock_quantity' => 10
        ]);

        $order = Order::factory()->for($user)->create([
            'status' => 'completed',
        ]);
        OrderItem::factory()->create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'variant_id' => $variant->id,
            'quantity' => 2,
        ]);

        $this->expectException(\App\Exceptions\OrderCannotBeCancelledException::class);

        $this->orderService->cancelOrder($order, $user);
    }

    public function test_cannot_cancel_other_users_order()
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();
        $product = Product::factory()->create(['is_active' => true]);
        $variant = ProductVariant::factory()->create([
            'product_id' => $product->id,
            'is_active' => true,
            'price' => 100000,
            'stock_quantity' => 10
        ]);

        $order = Order::factory()->for($user1)->create([
            'status' => 'pending',
        ]);
        OrderItem::factory()->create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'variant_id' => $variant->id,
            'quantity' => 2,
        ]);

        $this->expectException(\Illuminate\Auth\Access\AuthorizationException::class);

        $this->orderService->cancelOrder($order, $user2);
    }

    // ==================== CONFIRM ORDER TESTS ====================

    public function test_confirm_order_receives_points()
    {
        $user = User::factory()->create(['loyalty_points' => 0]);
        $product = Product::factory()->create(['is_active' => true]);
        $variant = ProductVariant::factory()->create([
            'product_id' => $product->id,
            'is_active' => true,
            'price' => 100000,
            'stock_quantity' => 10
        ]);

        $data = [
            'shipping_name' => 'Test User',
            'shipping_phone' => '0123456789',
            'shipping_address_line' => '123 Test St',
            'payment_method' => 'cod',
            'items' => [
                [
                    'product_id' => $product->id,
                    'variant_id' => $variant->id,
                    'quantity' => 1
                ]
            ]
        ];

        $order = $this->orderService->createOrder($user, $data, $data['items']);

        // Simulate order completion
        $completedOrder = $this->orderService->confirmOrderReceived($order, $user);

        $user->refresh();
        $this->assertGreaterThan(0, $user->loyalty_points);
    }

    // ==================== ORDER ITEM TESTS ====================

    public function test_order_items_have_correct_snapshots()
    {
        $user = User::factory()->create();
        $product = Product::factory()->create([
            'is_active' => true,
            'name' => 'Test Product',
        ]);
        $variant = ProductVariant::factory()->create([
            'product_id' => $product->id,
            'is_active' => true,
            'price' => 150000,
            'stock_quantity' => 10
        ]);

        $data = [
            'shipping_name' => 'Test User',
            'shipping_phone' => '0123456789',
            'shipping_address_line' => '123 Test St',
            'payment_method' => 'cod',
            'items' => [
                [
                    'product_id' => $product->id,
                    'variant_id' => $variant->id,
                    'quantity' => 2
                ]
            ]
        ];

        $order = $this->orderService->createOrder($user, $data, $data['items']);

        $orderItem = $order->items->first();
        $this->assertEquals('Test Product', $orderItem->product_name_snapshot);
        $this->assertEquals(150000, $orderItem->unit_price);
        $this->assertEquals(300000, $orderItem->total_price);
    }

    // ==================== PRICING TESTS ====================

    public function test_order_calculates_correct_totals()
    {
        $user = User::factory()->create();
        $product1 = Product::factory()->create(['is_active' => true]);
        $product2 = Product::factory()->create(['is_active' => true]);
        $variant1 = ProductVariant::factory()->create([
            'product_id' => $product1->id,
            'is_active' => true,
            'price' => 100000,
            'stock_quantity' => 10
        ]);
        $variant2 = ProductVariant::factory()->create([
            'product_id' => $product2->id,
            'is_active' => true,
            'price' => 50000,
            'stock_quantity' => 10
        ]);

        $data = [
            'shipping_name' => 'Test User',
            'shipping_phone' => '0123456789',
            'shipping_address_line' => '123 Test St',
            'shipping_fee' => 30000,
            'payment_method' => 'cod',
            'items' => [
                [
                    'product_id' => $product1->id,
                    'variant_id' => $variant1->id,
                    'quantity' => 1
                ],
                [
                    'product_id' => $product2->id,
                    'variant_id' => $variant2->id,
                    'quantity' => 2
                ]
            ]
        ];

        $order = $this->orderService->createOrder($user, $data, $data['items']);

        $this->assertEquals(200000, $order->subtotal_amount); // 100000 + 100000
        $this->assertEquals(30000, $order->shipping_fee);
        $this->assertEquals(230000, $order->total_amount); // 200000 + 30000
    }
}