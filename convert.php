<?php
$content = file_get_contents('etech_backup.sql');

// Try treating as double-encoded: UTF-8 bytes stored as UTF-16LE
$content = mb_convert_encoding($content, 'UTF-8', 'UTF-16LE');
file_put_contents('etech_backup_fixed.sql', $content);
echo "Done\n";