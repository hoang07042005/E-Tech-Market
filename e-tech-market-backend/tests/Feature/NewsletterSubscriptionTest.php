<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class NewsletterSubscriptionTest extends TestCase
{
    use DatabaseTransactions;

    public function test_guest_can_subscribe_to_newsletter(): void
    {
        $this->postJson('/api/newsletter/subscriptions', [
            'email' => 'reader@example.com',
            'source' => 'blog',
        ])->assertCreated()
            ->assertJsonPath('data.email', 'reader@example.com');

        $this->postJson('/api/newsletter/subscriptions', [
            'email' => 'reader@example.com',
            'source' => 'blog',
        ])->assertOk()
            ->assertJsonPath('data.email', 'reader@example.com');
    }
}
