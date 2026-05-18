# E-Tech Market Backend

Laravel 10 API for E-Tech Market: catalog, cart, checkout, orders, payments, admin, blog, newsletter, reviews, notifications, and store settings.

## Requirements

- PHP 8.1+
- Composer
- PostgreSQL
- Node.js/npm only if building Laravel Vite assets

## Setup

```bash
composer install
cp .env.example .env
php artisan key:generate
```

Configure `.env`:

```env
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE="E-Tech Market"
DB_USERNAME=postgres
DB_PASSWORD=
```

Do not commit real mail, VNPAY, or MoMo secrets.

## Database

This project has a historical PostgreSQL schema file plus Laravel migrations. For a fresh local database, import the schema file:

```bash
psql -U postgres -d "E-Tech Market" -f database/schema-postgres.sql
```

If your existing database was created before the latest blog/newsletter tables and older base migrations show as pending, run only the new migration:

```bash
php artisan migrate --path=database/migrations/2026_05_12_000001_add_blog_metrics_comments_and_newsletter.php
```

## Run

```bash
php artisan serve
```

API base URL: `http://localhost:8000/api`

## Test

```bash
php artisan test
```

Current feature coverage includes admin access protection, blog comments/views, and newsletter subscription.
