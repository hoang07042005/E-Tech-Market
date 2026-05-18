<?php

namespace App\Logging;

use Monolog\Logger;

class CreateTelegramLogger
{
    public function __invoke(array $config): Logger
    {
        $botToken = (string) ($config['bot_token'] ?? env('TELEGRAM_BOT_TOKEN', ''));
        $chatId = (string) ($config['chat_id'] ?? env('TELEGRAM_CHAT_ID', ''));
        $level = $config['level'] ?? 'error';

        $logger = new Logger('telegram');
        $logger->pushHandler(new TelegramLoggingHandler($botToken, $chatId, $level));

        return $logger;
    }
}
