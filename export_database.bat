@echo off
chcp 65001 > nul

echo =======================================================================
echo           TIEN TRINH SAO LUU (EXPORT) DU LIEU E-TECH MARKET
echo =======================================================================
echo.
echo Dang ket noi vao database va xuat du lieu ra file SQL...
echo Vui long cho trong giay lat...
echo.

:: Setup PostgreSQL Password for CMD
set PGPASSWORD=123456

:: Run pg_dump using -f parameter to guarantee absolute UTF-8 encoding
"C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" -U postgres -d "E-Tech Market" --clean --if-exists --inserts -f database_real_data_backup.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo =======================================================================
    echo    [THANH CONG] Du lieu thuc te da duoc xuat thanh cong!
    echo    Ten file sao luu: database_real_data_backup.sql
    echo    Vi tri luu file: Thu muc goc cua du an d:\E-Tech-Market
    echo =======================================================================
) else (
    echo.
    echo =======================================================================
    echo    [THAT BAI] Co loi xay ra trong qua trinh export!
    echo    Vui long kiem tra xem Postgres tren may host co dang chay hay khong.
    echo =======================================================================
)
echo.
pause
