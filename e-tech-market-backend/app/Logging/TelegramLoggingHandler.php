<?php

namespace App\Logging;

use Monolog\Handler\AbstractProcessingHandler;
use Illuminate\Support\Facades\Http;

class TelegramLoggingHandler extends AbstractProcessingHandler
{
    public function __construct(
        protected string $botToken,
        protected string $chatId,
        $level = 'error',
        bool $bubble = true
    ) {
        // Map string level to Monolog level if needed, otherwise parent handles standard Monolog levels
        $monologLevel = match (strtolower((string) $level)) {
            'debug' => \Monolog\Level::Debug,
            'info' => \Monolog\Level::Info,
            'notice' => \Monolog\Level::Notice,
            'warning' => \Monolog\Level::Warning,
            'error' => \Monolog\Level::Error,
            'critical' => \Monolog\Level::Critical,
            'alert' => \Monolog\Level::Alert,
            'emergency' => \Monolog\Level::Emergency,
            default => \Monolog\Level::Error,
        };

        parent::__construct($monologLevel, $bubble);
    }

    protected function write(mixed $record): void
    {
        // Support both Monolog 2 (array) and Monolog 3 (LogRecord)
        $message = is_array($record) ? $record['message'] : $record->message;
        $context = is_array($record) ? $record['context'] : $record->context;
        $levelName = is_array($record) ? $record['level_name'] : $record->level->name;

        // Construct a highly detailed, professional Telegram markdown message
        $appName = config('app.name', 'E-Tech Market');
        $env = config('app.env', 'production');

        $text = "🚨 *[{$appName} - {$env}] CẢNH BÁO LỖI HỆ THỐNG*\n";
        $text .= "• *Mức độ:* `{$levelName}`\n";
        $text .= "• *Thời gian:* " . now()->toDateTimeString() . "\n";
        
        $cleanMsg = mb_substr(strip_tags((string) $message), 0, 1000, 'UTF-8');
        $text .= "• *Thông tin lỗi:* `{$cleanMsg}`\n";

        if (isset($context['exception'])) {
            $e = $context['exception'];
            if ($e instanceof \Throwable) {
                $file = str_replace(base_path(), '', $e->getFile());
                $line = $e->getLine();
                $text .= "• *Vị trí:* `{$file}` (Dòng: `{$line}`)\n";
                $trace = mb_substr($e->getTraceAsString(), 0, 800, 'UTF-8');
                $text .= "• *Trace:* \n```\n{$trace}\n```\n";
            }
        } elseif (!empty($context)) {
            $ctxStr = mb_substr(json_encode($context, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), 0, 800, 'UTF-8');
            $text .= "• *Context:* \n```json\n{$ctxStr}\n```\n";
        }

        if ($this->botToken !== '' && $this->chatId !== '') {
            try {
                Http::timeout(3)
                    ->post("https://api.telegram.org/bot{$this->botToken}/sendMessage", [
                        'chat_id' => $this->chatId,
                        'text' => $text,
                        'parse_mode' => 'Markdown',
                    ]);
            } catch (\Throwable) {
                // Fail silently to prevent infinite recursion
            }
        }
    }
}
