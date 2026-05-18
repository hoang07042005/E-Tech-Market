<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class LoggingTest extends TestCase
{
    public function test_telegram_log_channel_sends_http_request(): void
    {
        Http::fake([
            'https://api.telegram.org/*' => Http::response(['ok' => true], 200),
        ]);

        config([
            'logging.channels.telegram.bot_token' => 'TEST_BOT_TOKEN',
            'logging.channels.telegram.chat_id' => 'TEST_CHAT_ID',
        ]);

        Log::channel('telegram')->error('This is a test error message from automated tests.');

        Http::assertSent(function ($request) {
            return str_contains($request->url(), 'https://api.telegram.org/botTEST_BOT_TOKEN/sendMessage')
                && (string) $request['chat_id'] === 'TEST_CHAT_ID'
                && str_contains($request['text'], 'This is a test error message from automated tests.');
        });
    }

    public function test_telegram_log_channel_silently_ignores_missing_credentials(): void
    {
        Http::fake();

        config([
            'logging.channels.telegram.bot_token' => '',
            'logging.channels.telegram.chat_id' => '',
        ]);

        Log::channel('telegram')->error('This error should be ignored silently.');

        Http::assertNothingSent();
    }
}
