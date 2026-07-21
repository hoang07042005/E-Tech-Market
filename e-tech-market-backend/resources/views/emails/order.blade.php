<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px; color: #374151; }
        .container { max-width: 650px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        .header { text-align: center; padding: 25px; background-color: #ffffff; border-bottom: 2px solid #f3f4f6; }
        .header img { max-height: 45px; }
        .content { padding: 30px; }
        .title { font-size: 22px; font-weight: 700; margin-top: 0; margin-bottom: 20px; color: #111827; }
        .order-info { margin-bottom: 25px; line-height: 1.6; font-size: 15px; }
        .info-card { background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; margin-top: 15px; }
        .info-card p { margin: 5px 0; }
        .item-list { width: 100%; border-collapse: collapse; margin-top: 25px; }
        .item-list th { text-align: left; padding: 12px 10px; border-bottom: 2px solid #e5e7eb; color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
        .item-list td { padding: 15px 10px; border-bottom: 1px solid #e5e7eb; vertical-align: middle; }
        .item-image { width: 60px; height: 60px; object-fit: cover; border-radius: 6px; border: 1px solid #e5e7eb; }
        .item-details { display: inline-block; vertical-align: middle; margin-left: 15px; max-width: 200px; }
        .item-name { font-weight: 600; color: #1f2937; margin: 0 0 4px 0; font-size: 15px; line-height: 1.3; }
        .item-meta { font-size: 13px; color: #6b7280; }
        .total-row { text-align: right; font-size: 18px; font-weight: bold; color: #111827; margin-top: 20px; }
        .footer { text-align: center; padding: 25px; font-size: 13px; color: #9ca3af; background-color: #f9fafb; border-top: 1px solid #e5e7eb; }
        .btn { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 25px; font-size: 15px; text-align: center; transition: background-color 0.2s; }
        .btn:hover { background-color: #1d4ed8; }
        .price-text { color: #b45309; font-weight: 600; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            @if(file_exists(public_path('logo.png')))
                <img src="{{ $message->embed(public_path('logo.png')) }}" alt="E-Tech Market Logo" style="max-width: 250px; height: auto; margin: 0 auto; display: block;">
            @else
                <h2>E-Tech Market</h2>
            @endif
        </div>
        <div class="content">
            <h1 class="title">{{ $title }}</h1>
            <p style="font-size: 16px;">Xin chào <strong>{{ $order->shipping_name ?: 'quý khách' }}</strong>,</p>
            <div class="order-info">
                {!! nl2br(e($messageText)) !!}
                
                <div class="info-card">
                    <p><strong>Mã đơn hàng:</strong> <span style="color: #2563eb; font-weight: 600;">#{{ $order->order_code ?: ('ET-'.$order->id) }}</span></p>
                    <p><strong>Phương thức thanh toán:</strong> {{ strtoupper($order->payment?->method ?? 'COD') }}</p>
                    <p><strong>Địa chỉ giao hàng:</strong> {{ $order->shipping_address_line }}</p>
                    @if($order->shipping_phone)
                    <p><strong>Số điện thoại:</strong> {{ $order->shipping_phone }}</p>
                    @endif
                </div>
            </div>

            <h3 style="margin-top: 30px; margin-bottom: 10px; color: #374151; font-size: 18px;">Chi tiết đơn hàng</h3>
            <table class="item-list">
                <thead>
                    <tr>
                        <th style="width: 55%;">Sản phẩm</th>
                        <th style="text-align: right;">Đơn giá</th>
                        <th style="text-align: center;">SL</th>
                        <th style="text-align: right;">Thành tiền</th>
                    </tr>
                </thead>
                <tbody>
                    @php $order->loadMissing(['items.product', 'items.variant']); @endphp
                    @foreach($order->items as $item)
                    <tr>
                        <td>
                            @php
                                $imageUrl = $item->variant?->image_url ?? $item->product?->main_image_url;
                                
                                // Convert full local URLs back to relative paths
                                $appUrl = rtrim(config('app.url'), '/');
                                if ($imageUrl && str_starts_with($imageUrl, $appUrl)) {
                                    $imageUrl = substr($imageUrl, strlen($appUrl));
                                }
                                
                                $isLocal = $imageUrl && !str_starts_with($imageUrl, 'http');
                                $imgSrc = '';
                                if ($isLocal) {
                                    $localPath = ltrim($imageUrl, '/');
                                    $actualPath = str_starts_with($localPath, 'storage/') 
                                        ? storage_path('app/public/' . substr($localPath, 8)) 
                                        : public_path($localPath);
                                        
                                    if (file_exists($actualPath)) {
                                        $imgSrc = $message->embed($actualPath);
                                    } else {
                                        $imgSrc = config('app.url') . '/' . $localPath;
                                    }
                                } elseif ($imageUrl) {
                                    $imgSrc = $imageUrl;
                                }
                            @endphp
                            @if($imgSrc)
                                <img src="{{ $imgSrc }}" alt="{{ $item->product_name_snapshot }}" class="item-image" align="left">
                            @endif
                            <div class="item-details">
                                <p class="item-name">{{ $item->product_name_snapshot }}</p>
                                @if($item->variant && $item->variant->color)
                                    <span class="item-meta">Phân loại: {{ $item->variant->color }}</span>
                                @endif
                            </div>
                        </td>
                        <td style="text-align: right; color: #6b7280; font-size: 14px;">{{ number_format((float) $item->unit_price, 0, ',', '.') }} đ</td>
                        <td style="text-align: center; font-weight: 500;">x{{ $item->quantity }}</td>
                        <td style="text-align: right;" class="price-text">{{ number_format((float) $item->total_price, 0, ',', '.') }} đ</td>
                    </tr>
                    @endforeach
                </tbody>
            </table>

            <div class="info-card" style="margin-top: 20px; text-align: right;">
                <p>Tạm tính: {{ number_format((float) $order->subtotal_amount, 0, ',', '.') }} đ</p>
                @if($order->discount_amount > 0)
                <p>Giảm giá: -{{ number_format((float) $order->discount_amount, 0, ',', '.') }} đ</p>
                @endif
                @if($order->points_discount > 0)
                <p>Quy đổi điểm: -{{ number_format((float) $order->points_discount, 0, ',', '.') }} đ</p>
                @endif
                <p>Phí vận chuyển: {{ number_format((float) $order->shipping_fee, 0, ',', '.') }} đ</p>
                <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 10px 0;">
                <p style="font-size: 18px; font-weight: bold; color: #111827;">Tổng thanh toán: <span style="color: #e11d48;">{{ number_format((float) $order->total_amount, 0, ',', '.') }} đ</span></p>
            </div>

            <div style="text-align: center;">
                <a href="{{ rtrim((string) config('app.frontend_url'), '/') }}/profile/orders" class="btn" style="display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 25px; font-size: 15px;">ĐẾN TRANG ĐƠN HÀNG</a>
            </div>
        </div>
        <div class="footer">
            Cảm ơn bạn đã tin tưởng và lựa chọn E-Tech Market!<br>
            Mọi thắc mắc vui lòng liên hệ hotline: <strong>1900 1234</strong><br>
            <br>
            © {{ date('Y') }} E-Tech Market. All rights reserved.
        </div>
    </div>
</body>
</html>
