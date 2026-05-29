<?php

namespace Tests\Unit;

use App\Models\ProductVariant;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductVariantTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_price_when_no_discount()
    {
        $v = ProductVariant::factory()->create(['price' => 100.00, 'discount_type' => null, 'discount_value' => null]);
        $this->assertSame(100.0, $v->effective_price);
    }

    public function test_percentage_discount_applies()
    {
        $v = ProductVariant::factory()->create([
            'price' => 200.00,
            'discount_type' => 'percentage',
            'discount_value' => 25,
            'discount_start_at' => Carbon::now()->subHour(),
            'discount_end_at' => Carbon::now()->addHour(),
        ]);

        $this->assertSame(150.0, $v->effective_price);
    }

    public function test_fixed_discount_applies()
    {
        $v = ProductVariant::factory()->create([
            'price' => 50.00,
            'discount_type' => 'fixed',
            'discount_value' => 10.25,
            'discount_start_at' => Carbon::now()->subHour(),
            'discount_end_at' => Carbon::now()->addHour(),
        ]);

        $this->assertSame(39.75, $v->effective_price);
    }

    public function test_discount_not_started_yet()
    {
        $v = ProductVariant::factory()->create([
            'price' => 100.00,
            'discount_type' => 'percentage',
            'discount_value' => 50,
            'discount_start_at' => Carbon::now()->addHour(),
            'discount_end_at' => Carbon::now()->addHours(2),
        ]);

        $this->assertSame(100.0, $v->effective_price);
    }

    public function test_discount_already_ended()
    {
        $v = ProductVariant::factory()->create([
            'price' => 120.00,
            'discount_type' => 'fixed',
            'discount_value' => 20,
            'discount_start_at' => Carbon::now()->subDays(2),
            'discount_end_at' => Carbon::now()->subDay(),
        ]);

        $this->assertSame(120.0, $v->effective_price);
    }
}
