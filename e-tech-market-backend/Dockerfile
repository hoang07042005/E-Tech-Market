FROM php:8.1-fpm

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libpq-dev \
    zip \
    unzip \
    supervisor

# Clear cache
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Install PHP extensions
RUN docker-php-ext-install pdo_mysql pdo_pgsql mbstring exif pcntl bcmath gd opcache

# Install phpredis extension (required for CACHE_DRIVER=redis / SESSION_DRIVER=redis)
RUN pecl install redis && docker-php-ext-enable redis

# Set PHP upload limits so banner image uploads do not fail on Docker default settings
RUN printf '%s\n' \
    'upload_max_filesize = 20M' \
    'post_max_size = 20M' \
    'memory_limit = 512M' \
    'max_execution_time = 300' \
    'max_input_time = 300' \
    > /usr/local/etc/php/conf.d/uploads.ini

# Enable and configure OPcache for development/production
RUN printf '%s\n' \
    'opcache.enable=1' \
    'opcache.memory_consumption=256' \
    'opcache.interned_strings_buffer=16' \
    'opcache.max_accelerated_files=10000' \
    'opcache.revalidate_freq=0' \
    'opcache.validate_timestamps=1' \
    > /usr/local/etc/php/conf.d/opcache.ini

# Get latest Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www

# Copy existing application directory contents
COPY . .

# Copy supervisor configuration
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Install dependencies
RUN composer install --optimize-autoloader

# Set permissions
RUN chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache
RUN chmod -R 775 /var/www/storage /var/www/bootstrap/cache

CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]

RUN sed -i "s|listen = 127.0.0.1:9000|listen = 0.0.0.0:9000|" /usr/local/etc/php-fpm.d/www.conf
