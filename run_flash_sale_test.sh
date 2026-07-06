#!/bin/bash
# Flash Sale Load Test Runner
# Simple script to run different load test scenarios

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

HOST="${1:-http://localhost:8000}"
SCENARIO="${2:-standard}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Flash Sale Load Test Runner${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Host: ${HOST}${NC}"
echo -e "${YELLOW}Scenario: ${SCENARIO}${NC}"
echo ""

# Function to run test
run_test() {
    local scenario=$1
    local users=$2
    local rampup=$3
    local duration=$4
    
    echo -e "${BLUE}Scenario: ${scenario}${NC}"
    echo "  Users: ${users}"
    echo "  Ramp-up: ${rampup} users/sec"
    echo "  Duration: ${duration}"
    echo ""
    
    locust -f flash_sale_load_test.py \
        --host="${HOST}" \
        -u "${users}" \
        -r "${rampup}" \
        -t "${duration}" \
        --headless
}

case $SCENARIO in
    quick)
        echo -e "${GREEN}Running QUICK test (10 users, 30s)${NC}"
        run_test "Quick" 10 1 30s
        ;;
    standard)
        echo -e "${GREEN}Running STANDARD test (50 users, 2m)${NC}"
        run_test "Standard" 50 5 2m
        ;;
    heavy)
        echo -e "${GREEN}Running HEAVY test (100 users, 5m)${NC}"
        run_test "Heavy Load" 100 10 5m
        ;;
    stress)
        echo -e "${RED}Running STRESS test (200 users, 10m)${NC}"
        run_test "Stress" 200 20 10m
        ;;
    web)
        echo -e "${GREEN}Starting WEB UI on http://localhost:8089${NC}"
        locust -f flash_sale_load_test.py --host="${HOST}"
        ;;
    *)
        echo -e "${YELLOW}Usage: $0 [host] [scenario]${NC}"
        echo ""
        echo "Scenarios:"
        echo "  quick    - 10 users for 30 seconds (test basic functionality)"
        echo "  standard - 50 users for 2 minutes (default)"
        echo "  heavy    - 100 users for 5 minutes (stress testing)"
        echo "  stress   - 200 users for 10 minutes (maximum load)"
        echo "  web      - Interactive web UI mode"
        echo ""
        echo "Example:"
        echo "  $0 http://localhost:8000 quick"
        echo "  $0 http://api.example.com heavy"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}Test completed!${NC}"
