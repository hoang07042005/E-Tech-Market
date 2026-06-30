<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Payment;
use App\Models\User;
use App\Services\PaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Http\Request;
use Tests\TestCase;

class PaymentServiceTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected PaymentService $paymentService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->paymentService = app(PaymentService::class);
    }

    // ==================== VNPAY PAYMENT CREATION ====================

    public function test_vnpay_payment_url_is_generated_correctly()
    {
        $order = Order::factory()->create([
            'order_code' => 'ET-TEST-123',
            'total_amount' => 150000,
            'status' => 'pending',
        ]);

        Payment::factory()->create([
            'order_id' => $order->id,
            'method' => 'vnpay',
            'status' => 'pending',
            'amount' => 150000,
        ]);

        // Mock VNPAY config
        config(['services.vnpay.tmn_code' => 'TESTCODE']);
        config(['services.vnpay.hash_secret' => 'TESTSECRETKEY']);
        config(['services.vnpay.url' => 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html']);

        $request = $this->createMockRequest(['REMOTE_ADDR' => '127.0.0.1']);

        $url = $this->paymentService->createVnpayPayment($order, $request);

        $this->assertStringContainsString('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html', $url);
        $this->assertStringContainsString('vnp_Amount=15000000', $url); // amount * 100
        $this->assertStringContainsString('vnp_TxnRef=' . $order->id, $url);
        $this->assertStringContainsString('vnp_SecureHash=', $url);
    }

    public function test_vnpay_url_contains_correct_parameters()
    {
        $order = Order::factory()->create([
            'order_code' => 'ET-456789',
            'total_amount' => 500000,
            'status' => 'pending',
        ]);

        Payment::factory()->create([
            'order_id' => $order->id,
            'method' => 'vnpay',
            'status' => 'pending',
            'amount' => 500000,
        ]);

        config(['services.vnpay.tmn_code' => 'TESTCODE']);
        config(['services.vnpay.hash_secret' => 'TESTSECRETKEY']);
        config(['services.vnpay.url' => 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html']);
        config(['services.vnpay.return_url' => 'https://example.com/return']);

        $request = $this->createMockRequest(['REMOTE_ADDR' => '192.168.1.1']);

        $url = $this->paymentService->createVnpayPayment($order, $request);

        $this->assertStringContainsString('vnp_TmnCode=TESTCODE', $url);
        $this->assertStringContainsString('vnp_CurrCode=VND', $url);
        $this->assertStringContainsString('vnp_Locale=vn', $url);
    }

    // ==================== VNPAY CALLBACK ====================

    public function test_vnpay_callback_verifies_signature_correctly()
    {
        // Setup order and payment
        $order = Order::factory()->create([
            'status' => 'pending',
            'payment_status' => 'pending',
        ]);

        $payment = Payment::factory()->create([
            'order_id' => $order->id,
            'method' => 'vnpay',
            'status' => 'pending',
            'amount' => 100000,
        ]);

        config(['services.vnpay.hash_secret' => 'TESTSECRETKEY']);

        // Create valid signature
        $params = [
            'vnp_Amount' => '10000000',
            'vnp_BankCode' => 'NCB',
            'vnp_BankTranNo' => '12345',
            'vnp_CardType' => 'ATM',
            'vnp_OrderInfo' => 'Order ' . $order->id,
            'vnp_PayDate' => '20230629120000',
            'vnp_ResponseCode' => '00',
            'vnp_TmnCode' => 'TESTCODE',
            'vnp_TransactionNo' => '67890',
            'vnp_TransactionStatus' => '00',
            'vnp_TxnRef' => $order->id,
        ];

        $params['vnp_SecureHash'] = $this->generateVnpaySignature($params, 'TESTSECRETKEY');

        $callback = Request::create('/callback', 'GET', $params);

        $result = $this->paymentService->handleVnpayCallback($callback);

        $this->assertTrue($result['success']);
        $this->assertEquals('00', $result['response_code']);

        // Verify payment status updated
        $payment->refresh();
        $this->assertEquals('paid', $payment->status);
        $this->assertNotNull($payment->paid_at);

        // Verify order status updated
        $order->refresh();
        $this->assertEquals('processing', $order->status);
        $this->assertEquals('paid', $order->payment_status);
    }

    public function test_vnpay_callback_fails_with_invalid_signature()
    {
        $order = Order::factory()->create();

        $params = [
            'vnp_Amount' => '10000000',
            'vnp_ResponseCode' => '00',
            'vnp_TxnRef' => $order->id,
            'vnp_SecureHash' => 'invalid_signature',
        ];

        $callback = Request::create('/callback', 'GET', $params);

        config(['services.vnpay.hash_secret' => 'TESTSECRETKEY']);

        $result = $this->paymentService->handleVnpayCallback($callback);

        $this->assertFalse($result['success']);
    }

    public function test_vnpay_callback_handles_failed_payment()
    {
        $order = Order::factory()->create([
            'status' => 'pending',
            'payment_status' => 'pending',
        ]);

        $payment = Payment::factory()->create([
            'order_id' => $order->id,
            'method' => 'vnpay',
            'status' => 'pending',
        ]);

        config(['services.vnpay.hash_secret' => 'TESTSECRETKEY']);

        $params = [
            'vnp_Amount' => '10000000',
            'vnp_ResponseCode' => '99', // User cancelled
            'vnp_TxnRef' => $order->id,
            'vnp_TransactionStatus' => '99',
        ];

        $params['vnp_SecureHash'] = $this->generateVnpaySignature($params, 'TESTSECRETKEY');

        $callback = Request::create('/callback', 'GET', $params);

        $result = $this->paymentService->handleVnpayCallback($callback);

        $this->assertFalse($result['success']);

        $payment->refresh();
        $this->assertEquals('failed', $payment->status);
    }

    // ==================== MOMO PAYMENT CREATION ====================

    public function test_momo_payment_url_is_generated_correctly()
    {
        $order = Order::factory()->create([
            'order_code' => 'ET-MOMO-123',
            'total_amount' => 200000,
            'status' => 'pending',
        ]);

        Payment::factory()->create([
            'order_id' => $order->id,
            'method' => 'momo',
            'status' => 'pending',
            'amount' => 200000,
        ]);

        config(['services.momo.partner_code' => 'MOMO123456']);
        config(['services.momo.access_key' => 'ACCESSKEY']);
        config(['services.momo.secret_key' => 'SECRETKEY']);
        config(['services.momo.url' => 'https://test-payment.momo.vn/pay']);
        config(['services.momo.return_url' => 'https://example.com/return']);

        $request = $this->createMockRequest(['REMOTE_ADDR' => '127.0.0.1']);

        $result = $this->paymentService->createMomoPayment($order, $request);

        $this->assertArrayHasKey('pay_url', $result);
        $this->assertStringContainsString('https://test-payment.momo.vn/pay', $result['pay_url']);
        $this->assertArrayHasKey('order_id', $result);
        $this->assertArrayHasKey('request_id', $result);
    }

    // ==================== MOMO CALLBACK ====================

    public function test_momo_callback_verifies_signature_correctly()
    {
        $order = Order::factory()->create([
            'status' => 'pending',
            'payment_status' => 'pending',
        ]);

        $payment = Payment::factory()->create([
            'order_id' => $order->id,
            'method' => 'momo',
            'status' => 'pending',
            'amount' => 200000,
        ]);

        config(['services.momo.secret_key' => 'SECRETKEY']);

        $params = [
            'partnerCode' => 'MOMO123456',
            'orderId' => $order->id,
            'requestId' => $order->id . '_' . time(),
            'amount' => '200000',
            'resultCode' => '0',
            'message' => 'Successful',
            'transId' => '123456789',
        ];

        $params['signature'] = $this->generateMomoSignature($params, 'SECRETKEY');

        $callback = Request::create('/momo/callback', 'POST', $params);

        $result = $this->paymentService->handleMomoCallback($callback);

        $this->assertTrue($result['success']);

        $payment->refresh();
        $this->assertEquals('paid', $payment->status);
        $this->assertNotNull($payment->paid_at);
    }

    public function test_momo_callback_fails_with_invalid_signature()
    {
        $order = Order::factory()->create();

        $params = [
            'partnerCode' => 'MOMO123456',
            'orderId' => $order->id,
            'resultCode' => '0',
            'signature' => 'invalid',
        ];

        $callback = Request::create('/momo/callback', 'POST', $params);

        config(['services.momo.secret_key' => 'SECRETKEY']);

        $result = $this->paymentService->handleMomoCallback($callback);

        $this->assertFalse($result['success']);
    }

    public function test_momo_callback_handles_failed_payment()
    {
        $order = Order::factory()->create([
            'status' => 'pending',
            'payment_status' => 'pending',
        ]);

        $payment = Payment::factory()->create([
            'order_id' => $order->id,
            'method' => 'momo',
            'status' => 'pending',
        ]);

        config(['services.momo.secret_key' => 'SECRETKEY']);

        $params = [
            'partnerCode' => 'MOMO123456',
            'orderId' => $order->id,
            'requestId' => $order->id . '_' . time(),
            'resultCode' => '1006', // Duplicate request
            'message' => 'Duplicate request',
        ];

        $params['signature'] = $this->generateMomoSignature($params, 'SECRETKEY');

        $callback = Request::create('/momo/callback', 'POST', $params);

        $result = $this->paymentService->handleMomoCallback($callback);

        $this->assertFalse($result['success']);
    }

    // ==================== REFUND TESTS ====================

    public function test_payment_can_be_refunded()
    {
        $order = Order::factory()->create([
            'status' => 'cancelled',
            'payment_status' => 'paid',
        ]);

        $payment = Payment::factory()->create([
            'order_id' => $order->id,
            'method' => 'vnpay',
            'status' => 'paid',
            'amount' => 100000,
        ]);

        $result = $this->paymentService->refundPayment($payment, 'Customer request');

        $this->assertTrue($result['success']);

        $payment->refresh();
        $this->assertEquals('refunded', $payment->status);
    }

    public function test_cannot_refund_pending_payment()
    {
        $order = Order::factory()->create([
            'status' => 'pending',
            'payment_status' => 'pending',
        ]);

        $payment = Payment::factory()->create([
            'order_id' => $order->id,
            'method' => 'vnpay',
            'status' => 'pending',
        ]);

        $this->expectException(\Exception::class);

        $this->paymentService->refundPayment($payment, 'Test');
    }

    // ==================== PAYMENT STATUS CHECK ====================

    public function test_payment_status_can_be_checked()
    {
        $order = Order::factory()->create();

        $payment = Payment::factory()->create([
            'order_id' => $order->id,
            'method' => 'vnpay',
            'status' => 'paid',
            'amount' => 50000,
            'paid_at' => now(),
        ]);

        $status = $this->paymentService->checkPaymentStatus($payment);

        $this->assertEquals('paid', $status);
    }

    // ==================== HELPERS ====================

    protected function createMockRequest(array $server = []): Request
    {
        $server = array_merge([
            'REQUEST_METHOD' => 'GET',
            'HTTP_HOST' => 'example.com',
        ], $server);

        return Request::create('/test', 'GET', [], [], [], $server);
    }

    protected function generateVnpaySignature(array $params, string $secret): string
    {
        // Remove signature from params for calculation
        $data = $params;
        unset($data['vnp_SecureHash']);

        // Sort by key
        ksort($data);

        // Build hash string
        $hashString = http_build_query($data);

        return hash_hmac('sha512', $hashString, $secret);
    }

    protected function generateMomoSignature(array $params, string $secret): string
    {
        // Build raw hash string
        $rawHash = '';
        foreach ($params as $key => $value) {
            $rawHash .= $key . '=' . $value . '&';
        }
        $rawHash = rtrim($rawHash, '&');

        return hash_hmac('sha256', $rawHash, $secret);
    }
}