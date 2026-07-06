# Flash Sale Load Test Guide

## Overview
This load test script simulates concurrent users attempting to purchase items during a flash sale. It's designed to detect race conditions and inventory management issues.

## Setup

### 1. Install Locust
```bash
pip install locust
```

### 2. Configure Test Parameters
Edit `flash_sale_load_test.py` and update:
- `BASE_URL`: Your backend API endpoint (http://localhost:8000 or production URL)
- `product_variant_id`: Valid product variant ID in your flash sale
- `shipping_method_id`: Valid shipping method ID

### 3. Ensure Flash Sale is Active
Create a flash sale in the admin panel or database with:
- Status: `active` or `scheduled`
- At least one product variant with quantity limit

## Running the Test

### Quick Test (10 users, 30 seconds)
```bash
locust -f flash_sale_load_test.py --host=http://localhost:8000 -u 10 -r 1 -t 30s --headless
```

### Standard Test (50 users, 2 minutes)
```bash
locust -f flash_sale_load_test.py --host=http://localhost:8000 -u 50 -r 5 -t 2m --headless
```

### Heavy Load Test (100 users, 5 minutes)
```bash
locust -f flash_sale_load_test.py --host=http://localhost:8000 -u 100 -r 10 -t 5m --headless
```

### Web UI (Interactive)
```bash
locust -f flash_sale_load_test.py --host=http://localhost:8000
# Then open http://localhost:8089 in browser
```

## Parameters Explanation

- `-u 50`: Total number of concurrent users
- `-r 5`: Ramp-up rate (5 users per second)
- `-t 2m`: Test duration (2 minutes)
- `--headless`: Run without web UI

## Test Scenarios

### Scenario 1: Basic Inventory Check
**Goal**: Verify inventory constraints are enforced

```bash
locust -f flash_sale_load_test.py --host=http://localhost:8000 -u 20 -r 2 -t 1m --headless
```

**What it tests**:
- 20 concurrent users each try to buy 1 unit
- If flash sale has 15 units limit, last 5 should fail
- Verify `quantity_sold` never exceeds `quantity_limit`

### Scenario 2: Race Condition Detection
**Goal**: Detect if multiple users can purchase beyond inventory

```bash
locust -f flash_sale_load_test.py --host=http://localhost:8000 -u 50 -r 10 -t 30s --headless
```

**What it tests**:
- High concurrency to trigger potential race conditions
- Checks if database locks prevent overselling
- Looks for 409 (Conflict) responses

### Scenario 3: Sustained Load
**Goal**: Ensure stability under continuous purchasing

```bash
locust -f flash_sale_load_test.py --host=http://localhost:8000 -u 100 -r 20 -t 5m --headless
```

**What it tests**:
- Sustained purchasing over 5 minutes
- Performance degradation over time
- Memory leaks or connection issues

## Analyzing Results

### Look for Red Flags:

1. **Race Condition (Inventory Overbooking)**
   ```
   ⚠️ RACE CONDITION DETECTED: Sold 105 > Limit 100
   ```
   Solution: Implement database locks or atomic transactions

2. **High Error Rate**
   - If > 10% of requests fail, investigate backend
   - Check Redis/database connections
   - Verify insufficient funds vs actual errors

3. **Timeout Issues**
   - Requests exceeding 10s timeout
   - Indicates backend bottleneck
   - Consider caching or query optimization

4. **409 Conflicts**
   - Quantity exceeds limit
   - Another user completed purchase
   - Expected behavior in high concurrency

## Expected Results

### ✅ Healthy System
```
Successful purchases: 95%+
Race conditions: 0
409 conflicts: 0-5%
Average response time: < 2000ms
```

### ⚠️ Needs Investigation
```
Successful purchases: 70-95%
Race conditions: Detected
409 conflicts: > 10%
Average response time: > 3000ms
```

### ❌ Critical Issues
```
Successful purchases: < 70%
Race conditions: Multiple
Sold > Limit in inventory
500 errors: Any
```

## Common Issues & Fixes

### Issue: Connection Refused
```
Error: [Errno 111] Connection refused
```
**Fix**: Ensure backend is running
```bash
docker-compose up
```

### Issue: Authentication Failed
```
Error: Unauthorized (401)
```
**Fix**: 
- Verify JWT token setup
- Check `bearer` token format
- Validate user credentials

### Issue: Database Locks Cause Timeouts
**Fix**: Implement pessimistic locking:
```php
DB::transaction(function () {
    $inventory = Inventory::lockForUpdate()->find($variantId);
    // ... purchase logic
});
```

### Issue: Race Condition Detected
**Fix**: Add serializable isolation level:
```php
DB::transaction(function () {
    // Use serializable isolation
}, transactions: 3);  // Retry on conflict
```

## Performance Baseline

Document your baseline results for comparison:

| Metric | Expected | Actual |
|--------|----------|--------|
| Concurrent Users | 50 | _ |
| Success Rate | 99%+ | _ |
| Avg Response Time | < 500ms | _ |
| Max Response Time | < 2000ms | _ |
| Errors | < 1% | _ |
| Race Conditions | 0 | _ |

## Continuous Monitoring

Run this test regularly:
- Before each production deployment
- After any database optimization
- Monthly performance baseline

## Advanced Options

### Export Results
```bash
locust -f flash_sale_load_test.py --host=http://localhost:8000 \
  -u 50 -r 5 -t 2m --headless \
  --csv=results/flash_sale_test
```

### Custom Wait Time
Edit `wait_time` in the script:
```python
wait_time = between(0.5, 1.5)  # Faster requests
```

## Database Optimization Tips

For better race condition handling:

1. **Use Row-Level Locking**
   ```sql
   SELECT * FROM inventory FOR UPDATE WHERE id = ?
   ```

2. **Add Unique Constraint**
   ```sql
   ALTER TABLE flash_sale_items 
   ADD CONSTRAINT qty_not_exceeded CHECK (quantity_sold <= quantity_limit)
   ```

3. **Use Trigger for Inventory Update**
   ```sql
   CREATE TRIGGER check_quantity_limit
   BEFORE UPDATE ON flash_sale_items
   FOR EACH ROW
   WHEN NEW.quantity_sold > NEW.quantity_limit
   BEGIN
     SELECT RAISE(ABORT, 'Quantity limit exceeded');
   END;
   ```

## Questions?
Check the backend logs and database transactions to understand bottlenecks.
