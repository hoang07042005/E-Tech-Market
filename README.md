# 🛒 E-Tech Market

E-Tech Market is a premium full-stack electronics marketplace designed with modern visual aesthetics and robust payment integrations.

This project is split into two primary components:
- **Backend API**: Built with **Laravel 10** inside [`e-tech-market-backend`](file:///d:/E-Tech-Market/e-tech-market-backend)
- **Frontend SPA**: Built with **React**, **TypeScript**, and **Vite** inside [`e-tech-market-frontend`](file:///d:/E-Tech-Market/e-tech-market-frontend)

---

## 📋 Prerequisites

Ensure you have the following installed on your system before proceeding:
- **PHP 8.1+**
- **Composer** (PHP Package Manager)
- **PostgreSQL** (Database)
- **Node.js (v18+) & npm** (Frontend runtime and package manager)

---

## ⚙️ Backend Setup

Follow these steps to set up and run the Laravel API backend:

### 1. Install Dependencies & Generate App Key
```bash
cd e-tech-market-backend
composer install
cp .env.example .env
php artisan key:generate
```

### 2. Configure Environment Variables
Open the generated `.env` file in [`e-tech-market-backend`](file:///d:/E-Tech-Market/e-tech-market-backend) and configure your database connection and system URLs:

```env
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE="E-Tech Market"
DB_USERNAME=postgres
DB_PASSWORD=your_postgres_password
```

### 3. Initialize the Database
If you are setting up a fresh local database, run the following PostgreSQL commands to import the database schema and default seed data (which includes product listings, users, and configurations):

```bash
# 1. Create the database (if not exists)
# 2. Import the schema structure
psql -U postgres -d "E-Tech Market" -f database/schema-postgres.sql

# 3. Import seed data (products, users, and configurations)
psql -U postgres -d "E-Tech Market" -f database/seed-postgres.sql
```

> [!NOTE]
> If you are working on an existing local database that has already been created, and you just need new features (like blogs/newsletters), run the Laravel migrations to update your tables:
> `php artisan migrate`

### 4. Create the Storage Symbolic Link
To ensure that uploaded avatars, category icons, and product images display correctly, you **must** generate the symbolic storage link:
```bash
php artisan storage:link
```

### 5. Start the Backend Server
```bash
cd e-tech-market-backend
php artisan serve
```
The backend API will be available at `http://localhost:8000`.

---

## 🎨 Frontend Setup

Follow these steps to set up and run the React SPA frontend:

### 1. Install Node Packages
```bash
cd e-tech-market-frontend
npm install
```

### 2. Configure Environment Variables (Optional)
If you need to point the frontend to a custom API URL, create a `.env` file in [`e-tech-market-frontend`](file:///d:/E-Tech-Market/e-tech-market-frontend):
```env
VITE_API_BASE_URL=http://localhost:8000
```

### 3. Start the Vite Dev Server
```bash
npm run dev
```
The frontend application will be hosted at `http://localhost:5173`.

---

## 🧪 Testing and Quality Checks

### Backend Unit/Feature Tests
To run Laravel's automated test suites:
```bash
cd e-tech-market-backend
php artisan test
```

### Frontend Linters and Production Build
To verify type-checking, code styling, and ensure production readiness:
```bash
cd e-tech-market-frontend
npm run lint
npm run build
```

---

## 💳 Sandbox Payment Testing Credentials

The marketplace is integrated with sandbox modes for local checkout testing:

### 📱 MoMo Wallet Test Credentials
- **Card/Wallet Number**: `9704 0000 0000 0018`
- **Issue Date**: `03/07`
- **Full Name**: `NGUYEN VAN A`
- **Phone Number**: Any valid Vietnamese phone number (e.g., `0900000000`)
- **OTP Code**: `OTP` (type literal string "OTP" in the OTP input)

### 🏦 VNPAY Bank Card Test Credentials
- **Bank Name**: `NCB`
- **Card Number**: `9704198526191432198`
- **Full Name**: `NGUYEN VAN A`
- **Issue Date**: `07/15`
- **OTP Code**: `123456`

---

## ⚠️ Notes & Security
- **Never commit real secrets** (like production DB passwords or payment keys) to version control. Keep `.env` ignored.
- Under Windows, running `php artisan storage:link` creates a Junction Link which resolves any issues with loading local media.
