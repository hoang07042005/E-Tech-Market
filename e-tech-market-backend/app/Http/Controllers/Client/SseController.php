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
            if (ob_get_level() > 0) {
                ob_flush();
            }
            flush();

            try {
                if (php_sapi_name() === 'cli-server' && strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
                    echo "data: {\"type\": \"ping\"}\n\n";
                    if (ob_get_level() > 0) ob_flush();
                    flush();
                    return; // Return immediately to free up the thread. Client will wait 3s due to 'retry: 3000'
                }

                $redis->subscribe([$channel], function ($message) {
                    echo "data: " . $message . "\n\n";
                    if (ob_get_level() > 0) {
                        ob_flush();
                    }
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
