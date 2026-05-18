# E-Tech Market

Full-stack electronics marketplace:

- Backend: Laravel 10 API in `e-tech-market-backend`
- Frontend: React + TypeScript + Vite in `e-tech-market-frontend`

## Prerequisites

- PHP 8.1+
- Composer
- PostgreSQL
- Node.js/npm

## Backend Setup

```bash
cd e-tech-market-backend
composer install
cp .env.example .env
php artisan key:generate
```

Configure database and local URLs in `.env`:

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

For a fresh database:

```bash
psql -U postgres -d "E-Tech Market" -f database/schema-postgres.sql
```

Use the schema import above for a clean local database. If you are working on an existing database that was created before the latest blog/newsletter tables, run the specific new migration from the backend folder.

Run backend:

```bash
cd e-tech-market-backend
php artisan serve
```

## Frontend Setup

```bash
cd e-tech-market-frontend
npm run dev

npm install
```

Frontend URL: `http://localhost:5173`

Optional `.env` for frontend:

```env
VITE_API_BASE_URL=http://localhost:8000
```

## Checks

Backend:

```bash
cd e-tech-market-backend
php artisan test
```

Frontend:

```bash
cd e-tech-market-frontend
npm run lint
npm run build
```

## Sandbox Payment Cards

MoMo test:

- Card: `9704 0000 0000 0018`
- Issue date: `03/07`
- Name: `NGUYEN VAN A`
- Phone: any valid phone, for example `0900000000`
- OTP: `OTP`

VNPAY test:

- Bank: `NCB`
- Card: `9704198526191432198`
- Name: `NGUYEN VAN A`
- Issue date: `07/15`
- OTP: `123456`

## Notes

- Do not commit real `.env` secrets.
- Existing local databases may have some old base migrations marked pending because the project also includes `database/schema-postgres.sql`.
