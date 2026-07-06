@echo off
REM This script removes all old migrations except the squashed one
REM Squashed migration: 2026_07_03_000000_squash_initial_migrations.php

cd database\migrations

REM Keep only the squashed migration and delete others
for /f "delims=" %%F in ('dir /b *.php') do (
    if not "%%F"=="2026_07_03_000000_squash_initial_migrations.php" (
        del "%%F"
        echo Deleted %%F
    )
)

echo.
echo Migration squash complete! Only 2026_07_03_000000_squash_initial_migrations.php remains.
echo.
echo Next steps:
echo 1. Update your .env file if needed
echo 2. Run: php artisan migrate:refresh (to test the squashed migration)
echo 3. Commit changes to git
pause
