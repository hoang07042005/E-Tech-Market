<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redis;

class SseController extends Controller
{
    public function stream(Request $request)
    {
        // Increase time limit for SSE
        set_time_limit(300);

        return response()->stream(function () use ($request) {
            $user = $request->user();
            if (! $user) {
                return;
            }

            $redis = Redis::connection();
            $channel = 'user-events.' . $user->id;

            echo "retry: 3000\n\n";
            ob_flush();
            flush();

            try {
                $redis->subscribe([$channel], function ($message) {
                    echo "data: " . $message . "\n\n";
                    ob_flush();
                    flush();
                });
            } catch (\Exception $e) {
                // Ignore connection errors
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no',
        ]);
    }
}
