@echo off
chcp 65001 >nul
echo ===================================================
echo   EXPORT DATABASE TU DOCKER POSTGRESQL RA SQL
echo ===================================================

set OUTPUT_FILE=database_real_data_backup_utf8.sql
echo Dang sao luu co so du lieu etech_market tu Docker ra %OUTPUT_FILE%...
docker compose exec -T db pg_dump -U postgres -d etech_market --encoding=UTF8 --clean --if-exists > "%OUTPUT_FILE%"

if %errorlevel% equ 0 (
    echo.
    echo ===================================================
    echo   XUAT DU LIEU THANH CONG: %OUTPUT_FILE%
    echo ===================================================
) else (
    echo [LOI] Khong the xuat du lieu tu container db.
)
pause
