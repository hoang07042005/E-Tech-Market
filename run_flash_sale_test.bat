@echo off
REM Flash Sale Load Test Runner for Windows
REM Simple script to run different load test scenarios

setlocal enabledelayedexpansion

set HOST=%1
set SCENARIO=%2

if "!HOST!"=="" set HOST=http://localhost:8000
if "!SCENARIO!"=="" set SCENARIO=standard

echo.
echo ========================================
echo Flash Sale Load Test Runner
echo ========================================
echo.
echo Host: !HOST!
echo Scenario: !SCENARIO!
echo.

if "!SCENARIO!"=="quick" (
    echo Running QUICK test (10 users, 30s)
    locust -f flash_sale_load_test.py --host=!HOST! -u 10 -r 1 -t 30s --headless
    goto :end
)

if "!SCENARIO!"=="standard" (
    echo Running STANDARD test (50 users, 2m)
    locust -f flash_sale_load_test.py --host=!HOST! -u 50 -r 5 -t 2m --headless
    goto :end
)

if "!SCENARIO!"=="heavy" (
    echo Running HEAVY test (100 users, 5m)
    locust -f flash_sale_load_test.py --host=!HOST! -u 100 -r 10 -t 5m --headless
    goto :end
)

if "!SCENARIO!"=="stress" (
    echo Running STRESS test (200 users, 10m)
    locust -f flash_sale_load_test.py --host=!HOST! -u 200 -r 20 -t 10m --headless
    goto :end
)

if "!SCENARIO!"=="web" (
    echo Starting WEB UI on http://localhost:8089
    locust -f flash_sale_load_test.py --host=!HOST!
    goto :end
)

echo Usage: !0! [host] [scenario]
echo.
echo Scenarios:
echo   quick    - 10 users for 30 seconds (test basic functionality)
echo   standard - 50 users for 2 minutes (default)
echo   heavy    - 100 users for 5 minutes (stress testing)
echo   stress   - 200 users for 10 minutes (maximum load)
echo   web      - Interactive web UI mode
echo.
echo Example:
echo   !0! http://localhost:8000 quick
echo   !0! http://api.example.com heavy
echo.

:end
echo.
echo Test completed!
pause
