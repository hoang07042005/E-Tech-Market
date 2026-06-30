<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PaymentFlowIntegrationTest extends TestCase
{
    use RefreshDatabase;

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

        $this->customerUser = User::factory()->create([
            'is_active' => true,
            'email' => 'customer@example.com',
        ]);
        $this->customerUser->roles()->attach($role->id);

        $category = Category::create([
            'name' => 'Payment Flow Category',
            'slug' => 'payment-flow-category',
            'is_active' => true,
        ]);

        $product = Product::create([
            'category_id' => $category->id,
            'name' => 'Payment Flow Product',
            'slug' => 'payment-flow-product',
            'brand' => 'FlowBrand',
            'is_active' => true,
        ]);

        ProductVariant::create([
            'product_id' => $product->id,
            'variant_name' => 'Payment Flow Variant',
            'sku' => 'FLOW-SKU-001',
            'price' => 100000,
            'stock_quantity' => 10,
            'is_active' => true,
        ]);

        $this->vnpayOrder = Order::create([
            'order_code' => 'OD-PAYFLOW-VNPAY',
            'user_id' => $this->customerUser->id,
            'status' => 'pending',
            'payment_status' => 'pending',
            'subtotal_amount' => 100000,
            'discount_amount' => 0,
            'shipping_fee' => 0,
            'total_amount' => 100000,
            'shipping_name' => 'VNPAY Buyer',
            'shipping_phone' => '0987654322',
            'shipping_address_line' => '1 Payment St, Q.1',
        ]);

        $this->momoOrder = Order::create([
            'order_code' => 'OD-PAYFLOW-MOMO',
            'user_id' => $this->customerUser->id,
            'status' => 'pending',
            'payment_status' => 'pending',
            'subtotal_amount' => 100000,
            'discount_amount' => 0,
            'shipping_fee' => 0,
            'total_amount' => 100000,
            'shipping_name' => 'MoMo Buyer',
            'shipping_phone' => '0987654323',
            'shipping_address_line' => '2 Payment St, Q.1',
        ]);
    }

    public function test_vnpay_payment_flow_creates_session_and_completes_on_ipn(): void
    {
        Notification::fake();
        Sanctum::actingAs($this->customerUser);

        config([
            'services.vnpay.tmn_code' => 'VNPAYTMNCODE',
            'services.vnpay.hash_secret' => 'vnpaysecretkey',
            'services.vnpay.url' => 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
            'app.url' => 'https://backend.example.test',
            'app.frontend_url' => 'https://frontend.example.test',
        ]);

        $createResponse = $this->postJson('/api/v1/payments/vnpay/'.$this->vnpayOrder->id.'/create');

        $createResponse->assertOk()
            ->assertJsonPath('order_id', $this->vnpayOrder->id)
            ->assertJsonPath('order_code', 'OD-PAYFLOW-VNPAY')
            ->assertJsonStructure(['payment_id', 'pay_url']);

        $paymentId = $createResponse->json('payment_id');
        $this->assertDatabaseHas('payments', [
            'id' => $paymentId,
            'order_id' => $this->vnpayOrder->id,
            'method' => 'vnpay',
            'status' => 'pending',
            'amount' => 100000,
        ]);

        $params = [
            'vnp_Amount' => '10000000',
            'vnp_ResponseCode' => '00',
            'vnp_TransactionNo' => 'VN-PAYFLOW-123',
            'vnp_TransactionStatus' => '00',
            'vnp_TxnRef' => 'OD-PAYFLOW-VNPAY',
        ];

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

        $params['vnp_SecureHash'] = hash_hmac('sha512', $hashData, 'vnpaysecretkey');

        $ipnResponse = $this->getJson('/api/v1/payments/vnpay/ipn?'.http_build_query($params));

        $ipnResponse->assertOk()
            ->assertJsonPath('RspCode', '00')
            ->assertJsonPath('Message', 'Confirm Success');

        $this->assertEquals('paid', $this->vnpayOrder->fresh()->payment_status);
        $this->assertDatabaseHas('payments', [
            'id' => $paymentId,
            'status' => 'paid',
            'transaction_code' => 'VN-PAYFLOW-123',
        ]);
    }

    public function test_momo_payment_flow_creates_session_and_completes_on_ipn(): void
    {
        Notification::fake();
        Sanctum::actingAs($this->customerUser);

        config([
            'services.momo.partner_code' => 'MOMO_PARTNER',
            'services.momo.access_key' => 'MOMO_ACCESS',
            'services.momo.secret_key' => 'MOMO_SECRET',
            'services.momo.endpoint' => 'https://test-payment.momo.vn/v2/gateway/api/create',
            'app.url' => 'https://backend.example.test',
            'app.frontend_url' => 'https://frontend.example.test',
        ]);

        Http::fake([
            'https://test-payment.momo.vn/v2/gateway/api/create' => Http::response([
                'resultCode' => '0',
                'message' => 'Success',
                'payUrl' => 'https://momo.example.test/pay',
            ], 200),
        ]);

        $createResponse = $this->postJson('/api/v1/payments/momo/'.$this->momoOrder->id.'/create', [
            'request_type' => 'payWithMethod',
        ]);

        $createResponse->assertOk()
            ->assertJsonPath('order_id', $this->momoOrder->id)
            ->assertJsonPath('order_code', 'OD-PAYFLOW-MOMO')
            ->assertJsonPath('pay_url', 'https://momo.example.test/pay')
            ->assertJsonStructure(['payment_id', 'raw']);

        $paymentId = $createResponse->json('payment_id');
        $this->assertDatabaseHas('payments', [
            'id' => $paymentId,
            'order_id' => $this->momoOrder->id,
            'method' => 'momo',
            'status' => 'pending',
            'amount' => 100000,
        ]);

        $extraData = base64_encode(json_encode([
            'order_code' => 'OD-PAYFLOW-MOMO',
            'order_id' => $this->momoOrder->id,
        ]));

        $payload = [
            'partnerCode' => 'MOMO_PARTNER',
            'orderId' => 'OD-PAYFLOW-MOMO__uuid12345',
            'requestId' => 'req-uuid-12345',
            'amount' => '100000',
            'orderInfo' => 'Thanh toán đơn OD-PAYFLOW-MOMO',
            'orderType' => 'momo_wallet',
            'transId' => 'MM-PAYFLOW-123',
            'resultCode' => '0',
            'message' => 'Successful.',
            'payType' => 'qr',
            'responseTime' => '2026-05-18 12:00:00',
            'extraData' => $extraData,
        ];

        $rawHash = 'accessKey='.'MOMO_ACCESS'.
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

        $payload['signature'] = hash_hmac('sha256', $rawHash, 'MOMO_SECRET');

        $ipnResponse = $this->postJson('/api/v1/payments/momo/ipn', $payload);

        $ipnResponse->assertOk()
            ->assertJsonPath('verified', true)
            ->assertJsonPath('success', true)
            ->assertJsonPath('order_code', 'OD-PAYFLOW-MOMO');

        $this->assertEquals('paid', $this->momoOrder->fresh()->payment_status);
        $this->assertDatabaseHas('payments', [
            'id' => $paymentId,
            'status' => 'paid',
            'transaction_code' => 'MM-PAYFLOW-123',
        ]);
    }

    public function test_confirm_payment_endpoint_marks_cod_order_paid(): void
    {
        Sanctum::actingAs($this->customerUser);

        $order = Order::create([
            'order_code' => 'OD-PAYFLOW-COD',
            'user_id' => $this->customerUser->id,
            'status' => 'pending',
            'payment_status' => 'pending',
            'subtotal_amount' => 100000,
            'discount_amount' => 0,
            'shipping_fee' => 0,
            'total_amount' => 100000,
            'shipping_name' => 'COD Buyer',
            'shipping_phone' => '0987654324',
            'shipping_address_line' => '3 Payment St, Q.1',
        ]);

        Payment::create([
            'order_id' => $order->id,
            'method' => 'cod',
            'amount' => 100000,
            'currency' => 'VND',
            'status' => 'pending',
        ]);

        $response = $this->patchJson('/api/v1/orders/'.$order->id.'/confirm-payment');

        $response->assertOk();
        $this->assertEquals('paid', $order->fresh()->payment_status);
        $this->assertDatabaseHas('payments', [
            'order_id' => $order->id,
            'method' => 'cod',
            'status' => 'paid',
        ]);
    }
}
