<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Role;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class PaymentGatewayTest extends TestCase
{
    use DatabaseTransactions;

    private User $customerUser;

    private Order $vnpayOrder;

    private Order $momoOrder;

    protected function setUp(): void
    {
        parent::setUp();

        $role = Role::query()->firstOrCreate(
            ['slug' => 'customer'],
            ['name' => 'Customer', 'description' => 'Customer']
        );

        $this->customerUser = User::factory()->create(['is_active' => true]);
        $this->customerUser->roles()->attach($role->id);

        $category = Category::create([
            'name' => 'Gateway Category',
            'slug' => 'gateway-category-slug',
            'is_active' => true,
        ]);

        $product = Product::create([
            'category_id' => $category->id,
            'name' => 'Gateway Product',
            'slug' => 'gateway-product-slug',
            'brand' => 'GatewayBrand',
            'is_active' => true,
        ]);

        $variant = ProductVariant::create([
            'product_id' => $product->id,
            'variant_name' => 'Gateway Variant',
            'sku' => 'GATEWAY-SKU',
            'price' => 150000,
            'stock_quantity' => 10,
            'is_active' => true,
        ]);

        // Create Order for VNPAY test
        $this->vnpayOrder = Order::create([
            'order_code' => 'OD-TESTVNPAY',
            'user_id' => $this->customerUser->id,
            'status' => 'pending',
            'payment_status' => 'pending',
            'subtotal_amount' => 150000,
            'discount_amount' => 0,
            'shipping_fee' => 0,
            'total_amount' => 150000,
            'shipping_name' => 'VNPAY User',
            'shipping_phone' => '0987654321',
            'shipping_address_line' => '456 Le Loi, Q.1',
        ]);

        // Create Order for MoMo test
        $this->momoOrder = Order::create([
            'order_code' => 'OD-TESTMOMO',
            'user_id' => $this->customerUser->id,
            'status' => 'pending',
            'payment_status' => 'pending',
            'subtotal_amount' => 150000,
            'discount_amount' => 0,
            'shipping_fee' => 0,
            'total_amount' => 150000,
            'shipping_name' => 'MoMo User',
            'shipping_phone' => '0987654321',
            'shipping_address_line' => '789 CMT8, Q.3',
        ]);
    }

    public function test_vnpay_ipn_callback_success(): void
    {
        config(['services.vnpay.hash_secret' => 'vnpaysecretkey']);

        $params = [
            'vnp_Amount' => '15000000', // 150,000 VND * 100
            'vnp_ResponseCode' => '00',
            'vnp_TransactionNo' => 'VN12345678',
            'vnp_TransactionStatus' => '00',
            'vnp_TxnRef' => 'OD-TESTVNPAY',
        ];

        // Generate VNPAY secure hash
        ksort($params);
        $hashData = '';
        $i = 0;
        foreach ($params as $key => $value) {
            if ($i === 1) {
                $hashData .= '&'.urlencode($key).'='.urlencode($value);
            } else {
                $hashData .= urlencode($key).'='.urlencode($value);
                $i = 1;
            }
        }

        $secureHash = hash_hmac('sha512', $hashData, 'vnpaysecretkey');
        $params['vnp_SecureHash'] = $secureHash;

        $response = $this->getJson('/api/payments/vnpay/ipn?'.http_build_query($params));

        $response->assertOk()
            ->assertJsonPath('RspCode', '00')
            ->assertJsonPath('Message', 'Confirm Success');

        $this->vnpayOrder->refresh();
        $this->assertEquals('paid', $this->vnpayOrder->payment_status);

        $payment = Payment::where('order_id', $this->vnpayOrder->id)->first();
        $this->assertNotNull($payment);
        $this->assertEquals('paid', $payment->status);
        $this->assertEquals('VN12345678', $payment->transaction_code);

        $this->assertDatabaseHas('transactions', [
            'payment_id' => $payment->id,
            'provider' => 'vnpay',
            'provider_transaction_id' => 'VN12345678',
            'amount' => 150000.00,
            'status' => 'success',
        ]);
    }

    public function test_vnpay_ipn_callback_invalid_signature(): void
    {
        config(['services.vnpay.hash_secret' => 'vnpaysecretkey']);

        $params = [
            'vnp_Amount' => '15000000',
            'vnp_ResponseCode' => '00',
            'vnp_TransactionNo' => 'VN12345678',
            'vnp_TransactionStatus' => '00',
            'vnp_TxnRef' => 'OD-TESTVNPAY',
            'vnp_SecureHash' => 'wrongsignature',
        ];

        $response = $this->getJson('/api/payments/vnpay/ipn?'.http_build_query($params));

        $response->assertOk()
            ->assertJsonPath('RspCode', '97')
            ->assertJsonPath('Message', 'Invalid signature');

        $this->vnpayOrder->refresh();
        $this->assertEquals('pending', $this->vnpayOrder->payment_status);
    }

    public function test_momo_ipn_callback_success(): void
    {
        config([
            'services.momo.access_key' => 'momoaccesskey',
            'services.momo.secret_key' => 'momosecretkey',
        ]);

        $extraData = base64_encode(json_encode([
            'order_code' => 'OD-TESTMOMO',
            'order_id' => $this->momoOrder->id,
        ]));

        $payload = [
            'partnerCode' => 'momo',
            'orderId' => 'OD-TESTMOMO__uuid123456',
            'requestId' => 'req-uuid-123456',
            'amount' => '150000',
            'orderInfo' => 'Thanh toán đơn OD-TESTMOMO',
            'orderType' => 'momo_wallet',
            'transId' => 'MM98765432',
            'resultCode' => '0',
            'message' => 'Successful.',
            'payType' => 'qr',
            'responseTime' => '2026-05-18 12:00:00',
            'extraData' => $extraData,
        ];

        // Build MoMo signature raw string
        $rawHash = 'accessKey=momoaccesskey'.
            '&amount='.$payload['amount'].
            '&extraData='.$payload['extraData'].
            '&message='.$payload['message'].
            '&orderId='.$payload['orderId'].
            '&orderInfo='.$payload['orderInfo'].
            '&orderType='.$payload['orderType'].
            '&partnerCode='.$payload['partnerCode'].
            '&payType='.$payload['payType'].
            '&requestId='.$payload['requestId'].
            '&responseTime='.$payload['responseTime'].
            '&resultCode='.$payload['resultCode'].
            '&transId='.$payload['transId'];

        $signature = hash_hmac('sha256', $rawHash, 'momosecretkey');
        $payload['signature'] = $signature;

        $response = $this->postJson('/api/payments/momo/ipn', $payload);

        $response->assertOk()
            ->assertJsonPath('verified', true)
            ->assertJsonPath('success', true)
            ->assertJsonPath('order_code', 'OD-TESTMOMO');

        $this->momoOrder->refresh();
        $this->assertEquals('paid', $this->momoOrder->payment_status);

        $payment = Payment::where('order_id', $this->momoOrder->id)->first();
        $this->assertNotNull($payment);
        $this->assertEquals('paid', $payment->status);
        $this->assertEquals('MM98765432', $payment->transaction_code);

        $this->assertDatabaseHas('transactions', [
            'payment_id' => $payment->id,
            'provider' => 'momo',
            'provider_transaction_id' => 'MM98765432',
            'amount' => 150000.00,
            'status' => 'success',
        ]);
    }

    public function test_momo_ipn_callback_failed_payment(): void
    {
        config([
            'services.momo.access_key' => 'momoaccesskey',
            'services.momo.secret_key' => 'momosecretkey',
        ]);

        $extraData = base64_encode(json_encode([
            'order_code' => 'OD-TESTMOMO',
            'order_id' => $this->momoOrder->id,
        ]));

        $payload = [
            'partnerCode' => 'momo',
            'orderId' => 'OD-TESTMOMO__uuid123456',
            'requestId' => 'req-uuid-123456',
            'amount' => '150000',
            'orderInfo' => 'Thanh toán đơn OD-TESTMOMO',
            'orderType' => 'momo_wallet',
            'transId' => 'MM98765432',
            'resultCode' => '1006', // Transaction denied by user
            'message' => 'Transaction denied.',
            'payType' => 'qr',
            'responseTime' => '2026-05-18 12:00:00',
            'extraData' => $extraData,
        ];

        // Build MoMo signature raw string
        $rawHash = 'accessKey=momoaccesskey'.
            '&amount='.$payload['amount'].
            '&extraData='.$payload['extraData'].
            '&message='.$payload['message'].
            '&orderId='.$payload['orderId'].
            '&orderInfo='.$payload['orderInfo'].
            '&orderType='.$payload['orderType'].
            '&partnerCode='.$payload['partnerCode'].
            '&payType='.$payload['payType'].
            '&requestId='.$payload['requestId'].
            '&responseTime='.$payload['responseTime'].
            '&resultCode='.$payload['resultCode'].
            '&transId='.$payload['transId'];

        $signature = hash_hmac('sha256', $rawHash, 'momosecretkey');
        $payload['signature'] = $signature;

        $response = $this->postJson('/api/payments/momo/ipn', $payload);

        $response->assertOk()
            ->assertJsonPath('verified', true)
            ->assertJsonPath('success', false)
            ->assertJsonPath('order_code', 'OD-TESTMOMO');

        $this->momoOrder->refresh();
        $this->assertEquals('failed', $this->momoOrder->payment_status);

        $payment = Payment::where('order_id', $this->momoOrder->id)->first();
        $this->assertNotNull($payment);
        $this->assertEquals('failed', $payment->status);

        $this->assertDatabaseHas('transactions', [
            'payment_id' => $payment->id,
            'provider' => 'momo',
            'provider_transaction_id' => 'MM98765432',
            'amount' => 150000.00,
            'status' => 'failed',
        ]);
    }
}
