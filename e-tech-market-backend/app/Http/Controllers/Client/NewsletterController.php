<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\NewsletterSubscription;
use App\Notifications\NewsletterWelcomeNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;

class NewsletterController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'source' => ['nullable', 'string', 'max:80'],
        ]);

        $subscription = NewsletterSubscription::query()->updateOrCreate(
            ['email' => strtolower($data['email'])],
            [
                'source' => $data['source'] ?? 'blog',
                'subscribed_at' => now(),
                'unsubscribed_at' => null,
            ],
        );

        if ($subscription->wasRecentlyCreated) {
            Notification::route('mail', $subscription->email)->notify(new NewsletterWelcomeNotification());
        }

        return response()->json([
            'message' => 'Subscribed',
            'data' => $subscription,
        ], $subscription->wasRecentlyCreated ? 201 : 200);
    }
}
