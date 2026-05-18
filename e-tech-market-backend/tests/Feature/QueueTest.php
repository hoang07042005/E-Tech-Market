<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Notifications\PasswordResetLinkNotification;
use App\Notifications\NewsletterWelcomeNotification;
use App\Notifications\OrderConfirmationNotification;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Notification;
use Illuminate\Notifications\AnonymousNotifiable;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class QueueTest extends TestCase
{
    use DatabaseTransactions;

    public function test_password_reset_notification_is_queued(): void
    {
        Notification::fake();

        $user = User::factory()->create([
            'email' => 'test-reset-queue@etechmarket.vn',
        ]);

        $response = $this->postJson('/api/auth/forgot-password', [
            'email' => $user->email,
        ]);

        $response->assertStatus(200);

        Notification::assertSentTo(
            $user,
            PasswordResetLinkNotification::class
        );
    }

    public function test_newsletter_subscription_notification_is_queued(): void
    {
        Notification::fake();

        $response = $this->postJson('/api/newsletter/subscriptions', [
            'email' => 'newsletter-queue-test@etechmarket.vn',
            'source' => 'footer',
        ]);

        $response->assertStatus(201);

        Notification::assertSentTo(
            new AnonymousNotifiable,
            NewsletterWelcomeNotification::class,
            function ($notification, $channels, $notifiable) {
                return $notifiable->routes['mail'] === 'newsletter-queue-test@etechmarket.vn';
            }
        );
    }

    public function test_order_checkout_confirmation_is_queued(): void
    {
        Notification::fake();

        $user = User::factory()->create([
            'email' => 'customer-queue-test@etechmarket.vn',
        ]);

        Sanctum::actingAs($user);

        $category = Category::create([
            'name' => 'Queue Test Category',
            'slug' => 'queue-test-category',
            'is_active' => true,
        ]);

        $product = Product::create([
            'category_id' => $category->id,
            'name' => 'Queue Test Product',
            'slug' => 'queue-test-product',
            'is_active' => true,
            'brand' => 'E-Tech Brand',
        ]);

        $variant = ProductVariant::create([
            'product_id' => $product->id,
            'variant_name' => 'Queue Default Variant',
            'sku' => 'QUEUE-SKU-1',
            'price' => 100000.0,
            'stock_quantity' => 10,
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/orders/from-items', [
            'shipping_name' => 'John Doe',
            'shipping_phone' => '0987654321',
            'shipping_address_line' => '123 E-Tech Street',
            'payment_method' => 'cod',
            'items' => [
                [
                    'product_id' => $product->id,
                    'variant_id' => $variant->id,
                    'quantity' => 2,
                ]
            ],
        ]);

        $response->assertStatus(201);

        Notification::assertSentTo(
            new AnonymousNotifiable,
            OrderConfirmationNotification::class,
            function ($notification, $channels, $notifiable) {
                return $notifiable->routes['mail'] === 'customer-queue-test@etechmarket.vn';
            }
        );
    }
}
