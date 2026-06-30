<?php

$dirs = [
    __DIR__ . '/app/Http/Controllers/Client',
    __DIR__ . '/app/Http/Controllers/Admin',
];

foreach ($dirs as $dir) {
    if (!is_dir($dir)) continue;
    $files = glob($dir . '/*.php');
    foreach ($files as $file) {
        $content = file_get_contents($file);
        
        // Match return response()->json(['message' => 'some string' | $var], $code);
        $newContent = preg_replace_callback('/return\s+response\(\)->json\(\[\'message\'\s*=>\s*(.+?)\],\s*(.+?)\);/s', function($matches) {
            $msg = trim($matches[1]);
            $code = trim($matches[2]);
            return "abort($code, $msg);";
        }, $content);
        
        if ($newContent !== $content) {
            file_put_contents($file, $newContent);
            echo "Updated: $file\n";
        }
    }
}
