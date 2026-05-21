<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;
use App\Models\User;
use App\Models\Cart;

class CartFeatureTest extends TestCase
{
    use DatabaseTransactions;

    public function test_user_can_retrieve_cart()
    {
        $user = User::factory()->create();
        Cart::create([
            'user_id' => $user->id,
            'status' => 'active'
        ]);

        $response = $this->actingAs($user)->getJson('/api/cart');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'id',
            'user_id',
            'items'
        ]);
    }

    public function test_unauthenticated_user_cannot_access_cart()
    {
        $response = $this->getJson('/api/cart');
        $response->assertStatus(401);
    }
}
