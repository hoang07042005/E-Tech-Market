#!/bin/sh
set -e

# Configure PHP-FPM to log to stdout/stderr for Docker visibility
echo "Configuring PHP logging for Docker..."

# Fix PHP error logging to output to stdout (for docker logs)
sed -i 's|;error_log = /var/log/php_errors.log|error_log = /proc/1/fd/1|g' /usr/local/etc/php/php.ini 2>/dev/null || true

# Make sure logs are writable
mkdir -p /var/www/storage/logs
touch /var/www/storage/logs/laravel.log
chmod 666 /var/www/storage/logs/laravel.log 2>/dev/null || true

# Fix storage permissions
chmod -R 775 /var/www/storage
chown -R www-data:www-data /var/www/storage 2>/dev/null || true

# Link storage if not exists
if [ ! -L /var/www/public/storage ]; then
    php artisan storage:link --force
fi

echo "Starting PHP-FPM..."
exec php-fpm