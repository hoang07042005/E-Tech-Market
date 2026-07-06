"""
Locust load test script for E-Tech Market Flash Sale race condition testing
Tests concurrent user purchases during flash sale to detect race conditions and inventory issues
"""

from locust import HttpUser, task, between, events, constant
import json
import random
import time
from datetime import datetime


class FlashSaleUser(HttpUser):
    wait_time = between(1, 3)  # Wait 1-3 seconds between actions
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.user_id = None
        self.token = None
        self.flash_sale_id = None
        self.product_variant_id = None
        self.cart_id = None
        self.purchase_success = False
        self.race_condition_detected = False
    
    def on_start(self):
        """Setup - authenticate and prepare for flash sale"""
        self.register_user()
        self.login_user()
        self.get_current_flash_sale()
    
    def register_user(self):
        """Register a new user"""
        email = f"loadtest_{int(time.time() * 1000)}_{random.randint(1000, 9999)}@test.com"
        payload = {
            "name": f"Test User {random.randint(1000, 9999)}",
            "email": email,
            "password": "Test123456!",
            "password_confirmation": "Test123456!"
        }
        
        with self.client.post(
            "/api/v1/auth/register",
            json=payload,
            catch_response=True
        ) as response:
            if response.status_code == 201:
                response.success()
                data = response.json()
                self.token = data.get('access_token')
                self.user_id = data.get('user', {}).get('id')
            else:
                response.failure(f"Register failed: {response.text}")
    
    def login_user(self):
        """Login if not already authenticated"""
        if self.token:
            return
        
        payload = {
            "email": "test@example.com",
            "password": "password123"
        }
        
        with self.client.post(
            "/api/v1/auth/login",
            json=payload,
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
                data = response.json()
                self.token = data.get('access_token')
                self.user_id = data.get('user', {}).get('id')
            else:
                response.failure(f"Login failed: {response.text}")
    
    def get_current_flash_sale(self):
        """Get current/upcoming flash sale"""
        headers = {"Authorization": f"Bearer {self.token}"} if self.token else {}
        
        with self.client.get(
            "/api/v1/flash-sale/current",
            headers=headers,
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
                data = response.json()
                if data.get('data'):
                    flash_sale = data['data']
                    self.flash_sale_id = flash_sale.get('id')
                    
                    # Get first available item
                    if flash_sale.get('items') and len(flash_sale['items']) > 0:
                        item = flash_sale['items'][0]
                        self.product_variant_id = item.get('product_variant_id')
                        self.quantity_limit = item.get('quantity_limit')
                        self.quantity_sold = item.get('quantity_sold')
            else:
                response.failure(f"Failed to get flash sale: {response.text}")
    
    def create_cart(self):
        """Create or get user cart"""
        if self.cart_id:
            return
        
        headers = {"Authorization": f"Bearer {self.token}"} if self.token else {}
        
        with self.client.get(
            "/api/v1/carts",
            headers=headers,
            catch_response=True
        ) as response:
            if response.status_code == 200:
                data = response.json()
                if data.get('data'):
                    self.cart_id = data['data'].get('id')
                else:
                    # Create new cart
                    self.create_new_cart()
            else:
                self.create_new_cart()
    
    def create_new_cart(self):
        """Create new cart"""
        headers = {"Authorization": f"Bearer {self.token}"} if self.token else {}
        
        with self.client.post(
            "/api/v1/carts",
            headers=headers,
            json={},
            catch_response=True
        ) as response:
            if response.status_code == 201:
                data = response.json()
                self.cart_id = data.get('data', {}).get('id')
                response.success()
            else:
                response.failure(f"Failed to create cart: {response.text}")
    
    @task(3)
    def add_to_cart(self):
        """Add flash sale item to cart - HIGH PRIORITY TASK"""
        if not self.flash_sale_id or not self.product_variant_id:
            self.get_current_flash_sale()
            return
        
        self.create_cart()
        
        headers = {"Authorization": f"Bearer {self.token}"} if self.token else {}
        payload = {
            "product_id": random.randint(1, 50),  # Adjust based on your data
            "product_variant_id": self.product_variant_id,
            "quantity": 1  # Each user tries to buy 1 unit
        }
        
        with self.client.post(
            f"/api/v1/carts/{self.cart_id}/items",
            headers=headers,
            json=payload,
            catch_response=True,
            timeout=5
        ) as response:
            if response.status_code in [200, 201]:
                response.success()
            elif response.status_code == 409:
                # Conflict - might indicate quantity limit reached
                self.race_condition_detected = True
                response.failure(f"Inventory conflict - possible race condition: {response.text}")
            else:
                response.failure(f"Add to cart failed: {response.text}")
    
    @task(2)
    def checkout_purchase(self):
        """Complete purchase of flash sale item - MEDIUM PRIORITY"""
        if not self.cart_id or not self.token:
            self.create_cart()
            return
        
        headers = {"Authorization": f"Bearer {self.token}"}
        payload = {
            "shipping_address_line": "123 Test Street, Test City",
            "shipping_phone": "0912345678",
            "shipping_name": "Test User",
            "shipping_method_id": 1,  # Adjust based on your data
            "payment_method": "credit_card"
        }
        
        with self.client.post(
            "/api/v1/orders",
            headers=headers,
            json=payload,
            catch_response=True,
            timeout=10
        ) as response:
            if response.status_code in [200, 201]:
                response.success()
                self.purchase_success = True
                data = response.json()
                order_id = data.get('data', {}).get('id')
                self.log_purchase(order_id)
            else:
                response.failure(f"Checkout failed: {response.text}")
    
    @task(1)
    def verify_flash_sale_inventory(self):
        """Verify flash sale inventory status - LOW PRIORITY"""
        if not self.flash_sale_id:
            return
        
        headers = {"Authorization": f"Bearer {self.token}"} if self.token else {}
        
        with self.client.get(
            f"/api/v1/flash-sales/{self.flash_sale_id}",
            headers=headers,
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
                data = response.json()
                # Check inventory constraints
                for item in data.get('data', {}).get('items', []):
                    sold = item.get('quantity_sold', 0)
                    limit = item.get('quantity_limit', 0)
                    if sold > limit:
                        self.race_condition_detected = True
                        self.client.stats.log_error(
                            f"⚠️  RACE CONDITION DETECTED: Sold {sold} > Limit {limit}"
                        )
            else:
                response.failure(f"Failed to verify inventory: {response.text}")
    
    def log_purchase(self, order_id):
        """Log successful purchase"""
        print(f"[{datetime.now().strftime('%H:%M:%S')}] User {self.user_id} purchased order {order_id}")


# Event handlers
@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    print("=" * 60)
    print("🚀 FLASH SALE LOAD TEST STARTED")
    print("=" * 60)
    print(f"Start time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("Testing concurrent purchases with race condition detection...")
    print("=" * 60)


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    print("=" * 60)
    print("🏁 FLASH SALE LOAD TEST COMPLETED")
    print("=" * 60)
    print(f"End time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Print race condition summary
    race_condition_count = sum(
        1 for user in environment.runner.locusts 
        if hasattr(user, 'race_condition_detected') and user.race_condition_detected
    )
    
    if race_condition_count > 0:
        print(f"\n⚠️  RACE CONDITIONS DETECTED IN {race_condition_count} USERS")
    else:
        print("\n✅ NO RACE CONDITIONS DETECTED")
    
    print("=" * 60)


@events.request.add_listener
def on_request(request_type, name, response_time, response_length, exception, **kwargs):
    """Log request metrics"""
    if exception:
        print(f"❌ {request_type} {name}: FAILED - {exception}")
