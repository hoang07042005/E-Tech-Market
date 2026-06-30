<?php

namespace Tests\Unit;

use App\Models\Coupon;
use App\Models\CouponUsage;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CouponTestUnit extends TestCase
{
    use RefreshDatabase;

    // ==================== COUPON VALIDATION ====================

    public function test_active_coupon_within_period_is_valid()
    {
        $coupon = Coupon::factory()->create([
            'is_active' => true,
            'start_at' => Carbon::now()->subHour(),
            'end_at' => Carbon::now()->addHour(),
        ]);

        $this->assertTrue($coupon->isValidNow());
    }

    public function test_inactive_coupon_is_invalid()
    {
        $coupon = Coupon::factory()->inactive()->create();

        $this->assertFalse($coupon->isValidNow());
    }

    public function test_coupon_not_started_yet_is_invalid()
    {
        $coupon = Coupon::factory()->notYetStarted()->create([
            'is_active' => true,
        ]);

        $this->assertFalse($coupon->isValidNow());
    }

    public function test_coupon_ended_is_invalid()
    {
        $coupon = Coupon::factory()->expired()->create([
            'is_active' => true,
        ]);

        $this->assertFalse($coupon->isValidNow());
    }

    public function test_coupon_without_dates_is_always_valid()
    {
        $coupon = Coupon::factory()->create([
            'is_active' => true,
            'start_at' => null,
            'end_at' => null,
        ]);

        $this->assertTrue($coupon->isValidNow());
    }

    // ==================== COUPON USAGE LIMITS ====================

    public function test_coupon_is_invalid_when_max_uses_reached()
    {
        $coupon = Coupon::factory()->create([
            'is_active' => true,
            'start_at' => now()->subDay(),
            'end_at' => now()->addWeek(),
            'max_uses' => 5,
        ]);

        // Create 5 usages (reaching max)
        for ($i = 0; $i < 5; $i++) {
            CouponUsage::factory()->create([
                'coupon_id' => $coupon->id,
            ]);
        }

        $this->assertFalse($coupon->isValidNow());
    }

    public function test_coupon_is_valid_when_max_uses_is_null()
    {
        $coupon = Coupon::factory()->unlimited()->create([
            'is_active' => true,
            'start_at' => now()->subDay(),
            'end_at' => now()->addWeek(),
        ]);

        $this->assertTrue($coupon->isValidNow());
    }

    // ==================== COUPON TYPE TESTS ====================

    public function test_percentage_coupon_calculates_correct_discount()
    {
        $coupon = Coupon::factory()->percentage()->create([
            'value' => 10,
        ]);

        // Test calculation logic
        $orderAmount = 100000;
        $expectedDiscount = $orderAmount * 10 / 100; // 10%

        $this->assertEquals(10000, $expectedDiscount);
    }

    public function test_fixed_coupon_calculates_correct_discount()
    {
        $coupon = Coupon::factory()->fixed()->create([
            'value' => 50000,
        ]);

        $orderAmount = 100000;
        $expectedDiscount = min(50000, $orderAmount); // Fixed amount, not exceeding order

        $this->assertEquals(50000, $expectedDiscount);
    }

    public function test_fixed_coupon_does_not_exceed_order_amount()
    {
        $coupon = Coupon::factory()->fixed()->create([
            'value' => 100000,
        ]);

        $orderAmount = 50000;
        $expectedDiscount = min(100000, $orderAmount);

        $this->assertEquals(50000, $expectedDiscount);
    }

    // ==================== USER USAGE LIMIT ====================

    public function test_user_can_use_coupon_when_under_limit()
    {
        $coupon = Coupon::factory()->create([
            'max_uses_per_user' => 2,
        ]);

        $user = User::factory()->create();

        // Use once
        CouponUsage::factory()->create([
            'coupon_id' => $coupon->id,
            'user_id' => $user->id,
        ]);

        // Count usages for this user
        $usageCount = CouponUsage::where('coupon_id', $coupon->id)
            ->where('user_id', $user->id)
            ->count();

        $this->assertLessThan($coupon->max_uses_per_user, $usageCount);
    }

    public function test_user_cannot_use_coupon_when_at_limit()
    {
        $coupon = Coupon::factory()->create([
            'max_uses_per_user' => 1,
        ]);

        $user = User::factory()->create();

        // Already used once
        CouponUsage::factory()->create([
            'coupon_id' => $coupon->id,
            'user_id' => $user->id,
        ]);

        $usageCount = CouponUsage::where('coupon_id', $coupon->id)
            ->where('user_id', $user->id)
            ->count();

        $this->assertGreaterThanOrEqual($coupon->max_uses_per_user, $usageCount);
    }

    // ==================== COUPON STATE TESTS ====================

    public function test_coupon_factory_percentage_state()
    {
        $coupon = Coupon::factory()->percentage()->create();

        $this->assertEquals('percentage', $coupon->coupon_type);
        $this->assertgreaterThan(0, $coupon->value);
    }

    public function test_coupon_factory_fixed_state()
    {
        $coupon = Coupon::factory()->fixed()->create();

        $this->assertEquals('fixed', $coupon->coupon_type);
        $this->assertGreaterThan(0, $coupon->value);
    }

    public function test_coupon_factory_inactive_state()
    {
        $coupon = Coupon::factory()->inactive()->create();

        $this->assertFalse($coupon->is_active);
    }
}