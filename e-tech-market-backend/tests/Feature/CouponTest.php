<?php

namespace Tests\Feature;

use App\Models\Coupon;
use App\Models\CouponUsage;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CouponTest extends TestCase
{
    use DatabaseTransactions;

    private User $customerUser;

    protected function setUp(): void
    {
        parent::setUp();

        $role = Role::query()->firstOrCreate(
            ['slug' => 'customer'],
            ['name' => 'Customer', 'description' => 'Customer']
        );

        $this->customerUser = User::factory()->create(['is_active' => true]);
        $this->customerUser->roles()->attach($role->id);
    }

    public function test_apply_percentage_coupon_successfully(): void
    {
        $coupon = Coupon::create([
            'code' => 'ETECH20',
            'coupon_type' => 'percentage',
            'value' => 20,
            'min_order_amount' => 100000,
            'is_active' => true,
            'start_at' => Carbon::now()->subDay(),
            'end_at' => Carbon::now()->addDay(),
        ]);

        $response = $this->postJson('/api/coupons/apply', [
            'code' => 'ETECH20',
            'order_amount' => 500000,
        ]);

        $response->assertOk()
            ->assertJsonPath('discount_amount', 100000)
            ->assertJsonPath('coupon.code', 'ETECH20');
    }

    public function test_apply_fixed_coupon_successfully(): void
    {
        $coupon = Coupon::create([
            'code' => 'ETECH100K',
            'coupon_type' => 'fixed',
            'value' => 100000,
            'min_order_amount' => 200000,
            'is_active' => true,
            'start_at' => Carbon::now()->subDay(),
            'end_at' => Carbon::now()->addDay(),
        ]);

        $response = $this->postJson('/api/coupons/apply', [
            'code' => 'ETECH100K',
            'order_amount' => 300000,
        ]);

        $response->assertOk()
            ->assertJsonPath('discount_amount', '100000.00')
            ->assertJsonPath('coupon.code', 'ETECH100K');
    }

    public function test_apply_coupon_fails_when_expired(): void
    {
        $coupon = Coupon::create([
            'code' => 'EXPIRED50',
            'coupon_type' => 'percentage',
            'value' => 50,
            'min_order_amount' => 0,
            'is_active' => true,
            'start_at' => Carbon::now()->subDays(10),
            'end_at' => Carbon::now()->subDays(1),
        ]);

        $response = $this->postJson('/api/coupons/apply', [
            'code' => 'EXPIRED50',
            'order_amount' => 300000,
        ]);

        $response->assertStatus(400)
            ->assertJsonPath('message', 'Mã giảm giá đã hết hạn hoặc chưa được kích hoạt.');
    }

    public function test_apply_coupon_fails_when_min_amount_not_met(): void
    {
        $coupon = Coupon::create([
            'code' => 'VIP500K',
            'coupon_type' => 'fixed',
            'value' => 100000,
            'min_order_amount' => 500000,
            'is_active' => true,
            'start_at' => Carbon::now()->subDay(),
            'end_at' => Carbon::now()->addDay(),
        ]);

        $response = $this->postJson('/api/coupons/apply', [
            'code' => 'VIP500K',
            'order_amount' => 200000,
        ]);

        $response->assertStatus(400)
            ->assertJsonPath('message', 'Đơn hàng tối thiểu để áp dụng mã này là 500.000đ');
    }

    public function test_apply_coupon_fails_when_max_uses_reached(): void
    {
        $coupon = Coupon::create([
            'code' => 'LIMITED10',
            'coupon_type' => 'percentage',
            'value' => 10,
            'min_order_amount' => 0,
            'max_uses' => 2,
            'is_active' => true,
            'start_at' => Carbon::now()->subDay(),
            'end_at' => Carbon::now()->addDay(),
        ]);

        // Simulating usages
        CouponUsage::create([
            'coupon_id' => $coupon->id,
            'user_id' => $this->customerUser->id,
            'discount_amount' => 10000,
            'used_at' => Carbon::now(),
        ]);

        CouponUsage::create([
            'coupon_id' => $coupon->id,
            'user_id' => User::factory()->create()->id,
            'discount_amount' => 10000,
            'used_at' => Carbon::now(),
        ]);

        $response = $this->postJson('/api/coupons/apply', [
            'code' => 'LIMITED10',
            'order_amount' => 200000,
        ]);

        $response->assertStatus(400)
            ->assertJsonPath('message', 'Mã giảm giá đã hết lượt sử dụng.');
    }

    public function test_apply_coupon_fails_when_user_max_uses_reached(): void
    {
        $coupon = Coupon::create([
            'code' => 'ONETIME',
            'coupon_type' => 'percentage',
            'value' => 10,
            'min_order_amount' => 0,
            'max_uses_per_user' => 1,
            'is_active' => true,
            'start_at' => Carbon::now()->subDay(),
            'end_at' => Carbon::now()->addDay(),
        ]);

        // Simulating user usage
        CouponUsage::create([
            'coupon_id' => $coupon->id,
            'user_id' => $this->customerUser->id,
            'discount_amount' => 10000,
            'used_at' => Carbon::now(),
        ]);

        Sanctum::actingAs($this->customerUser);

        $response = $this->postJson('/api/coupons/apply', [
            'code' => 'ONETIME',
            'order_amount' => 200000,
        ]);

        $response->assertStatus(400)
            ->assertJsonPath('message', 'Bạn đã hết lượt sử dụng mã này.');
    }
}
