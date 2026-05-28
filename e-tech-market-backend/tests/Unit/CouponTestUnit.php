<?php

namespace Tests\Unit;

use App\Models\Coupon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Carbon\Carbon;

class CouponTestUnit extends TestCase
{
    use RefreshDatabase;

    public function test_active_coupon_within_period_is_valid()
    {
        $c = Coupon::factory()->create([
            'is_active' => true,
            'start_at' => Carbon::now()->subHour(),
            'end_at' => Carbon::now()->addHour(),
        ]);

        $this->assertTrue($c->isValidNow());
    }

    public function test_inactive_coupon_is_invalid()
    {
        $c = Coupon::factory()->create([
            'is_active' => false,
        ]);

        $this->assertFalse($c->isValidNow());
    }

    public function test_coupon_not_started_yet_is_invalid()
    {
        $c = Coupon::factory()->create([
            'is_active' => true,
            'start_at' => Carbon::now()->addDay(),
        ]);

        $this->assertFalse($c->isValidNow());
    }

    public function test_coupon_ended_is_invalid()
    {
        $c = Coupon::factory()->create([
            'is_active' => true,
            'end_at' => Carbon::now()->subDay(),
        ]);

        $this->assertFalse($c->isValidNow());
    }
}
