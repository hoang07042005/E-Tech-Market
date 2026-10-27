@echo off
chcp 65001 >nul
echo ===================================================
echo   IMPORT DATABASE VAO DOCKER POSTGRESQL (UTF-8)
echo ===================================================

set SQL_FILE=etech_clean_utf8.sql
if not exist "%SQL_FILE%" set SQL_FILE=database_real_data_backup_utf8.sql
if not exist "%SQL_FILE%" set SQL_FILE=etech_utf8.sql

if not exist "%SQL_FILE%" (
    echo [LOI] Khong tim thay file SQL du lieu trong thu muc goc!
    pause
    exit /b 1
)

echo Dang su dung file du lieu: %SQL_FILE%

echo [1/3] Kiem tra container Database dang chay...
docker compose exec -T db pg_isready -U postgres -d etech_market >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Container db chua san sang hoac chua bat. Dang khoi dong...
    docker compose up -d db
    timeout /t 5 >nul
)

echo [2/4] Nap du lieu vao database etech_market...
type "%SQL_FILE%" | docker compose exec -T db psql -U postgres -d etech_market

echo [3/4] Chay cac migrations bo sung (neu co)...
docker compose exec -T backend php artisan migrate --force >nul 2>&1

echo [4/4] Lam sach cache backend Laravel...
docker compose exec -T backend php artisan optimize:clear >nul 2>&1

echo.
echo ===================================================
echo   NAP DU LIEU THANH CONG!
echo   Tai khoan Admin: admin@etech.com / Mat khau: admin123
echo   (hoac doviethoang@gmail.com / Mat khau: 1234567890)
echo ===================================================
pause
