@echo off
chcp 65001 > nul

echo =======================================================================
echo           TIEN TRINH NAP (IMPORT) DU LIEU THUC TE VAO DOCKER
echo =======================================================================
echo.

:: Kiem tra xem file backup co ton tai khong
if not exist database_real_data_backup.sql (
    echo [THAT BAI] Khong tim thay file "database_real_data_backup.sql" o thu muc goc!
    echo Vui long chay file "export_database.bat" truoc de tao file backup.
    echo.
    pause
    exit /b
)

echo Dang tien hanh nap du lieu tu file "database_real_data_backup.sql" vao database etech trong Docker...
echo (Su dung phuong phap Direct Import de bao ton tieng Viet UTF-8 100%%)
echo Vui long cho trong giay lat...
echo.

:: 1. Don dep database cu trong Docker de tranh loi khoa ngoai (Foreign Keys)
docker compose exec -T db psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS etech WITH (FORCE);" > nul 2>&1
docker compose exec -T db psql -U postgres -d postgres -c "CREATE DATABASE etech;" > nul 2>&1

:: 2. Copy truc tiep file SQL vao container de tranh loi duong ong (pipe) Windows lam hong UTF-8
docker cp database_real_data_backup.sql e-tech-market-db-1:/tmp/database_real_data_backup.sql > nul 2>&1

:: 3. Thuc hien nap doc file truc tiep trong container
docker compose exec -T db psql -U postgres -d etech -f /tmp/database_real_data_backup.sql

if %ERRORLEVEL% EQU 0 (
    :: 4. Don dep file tam sau khi nap thanh cong
    docker compose exec -T db rm /tmp/database_real_data_backup.sql > nul 2>&1
    echo.
    echo =======================================================================
    echo    [THANH CONG] Du lieu thuc te da duoc nap vao Docker thanh cong!
    echo    Ban co the truy cap vao website http://localhost:5173 de kiem tra.
    echo =======================================================================
) else (
    echo.
    echo =======================================================================
    echo    [THAT BAI] Co loi xay ra trong qua trinh nap du lieu!
    echo    Vui long kiem tra xem cac container Docker co dang chay hay khong.
    echo =======================================================================
)
echo.
pause
