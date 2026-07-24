@component('mail::message')
# Đơn hàng mới cần giao

Chào bạn,

Bạn vừa được quản trị viên phân công giao một đơn hàng mới. Vui lòng đăng nhập vào hệ thống để xem chi tiết và tiến hành giao hàng.

**Mã đơn hàng:** {{ $order->order_code ?: ('ET-' . $order->id) }}  
**Tên khách hàng:** {{ $order->shipping_name ?: ($order->user->name ?? '') }}  
**Số điện thoại:** {{ $order->shipping_phone ?: ($order->user->phone ?? '') }}  
**Địa chỉ giao hàng:** {{ implode(', ', array_filter([$order->shipping_address_line, $order->shipping_ward, $order->shipping_district, $order->shipping_province])) }}  

@component('mail::button', ['url' => env('FRONTEND_URL', 'http://localhost:3000') . '/admin/orders'])
Xem đơn hàng
@endcomponent

Cảm ơn bạn,<br>
{{ config('app.name') }}
@endcomponent
