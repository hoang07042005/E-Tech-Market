<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Cập nhật trạng thái Yêu cầu Thu cũ đổi mới</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #334155;
            background-color: #f1f5f9;
            margin: 0;
            padding: 20px;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        }
        .email-header {
            padding: 30px 30px 10px 30px;
        }
        .email-header h2 {
            margin: 0;
            color: #0f172a;
            font-size: 24px;
        }
        .email-body {
            padding: 0 30px 30px 30px;
        }
        .price-box {
            background-color: #eff6ff;
            border-radius: 12px;
            padding: 25px;
            text-align: center;
            margin: 25px 0;
        }
        .price-label {
            color: #3b82f6;
            font-size: 13px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
        }
        .price-value {
            color: #2563eb;
            font-size: 32px;
            font-weight: bold;
            margin: 0;
        }
        .rejected-box {
            background-color: #fef2f2;
            border-radius: 12px;
            padding: 25px;
            text-align: center;
            margin: 25px 0;
        }
        .rejected-value {
            color: #ef4444;
            font-size: 24px;
            font-weight: bold;
            margin: 0;
        }
        .section-title {
            font-size: 13px;
            font-weight: bold;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .product-details {
            background-color: #f8fafc;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 30px;
            font-size: 14px;
        }
        .product-details p {
            margin: 0 0 10px 0;
        }
        .product-details p:last-child {
            margin-bottom: 0;
        }
        .note-container {
            margin-bottom: 30px;
        }
        .note-box {
            background-color: #fefce8;
            border: 1px solid #fef08a;
            border-radius: 8px;
            padding: 20px;
            margin: 15px 0;
        }
        .note-box strong {
            color: #b45309;
            display: block;
            margin-bottom: 10px;
        }
        .note-content {
            color: #92400e;
            font-size: 14px;
            white-space: pre-wrap;
            margin: 0;
        }
        .note-desc {
            font-size: 14px;
            color: #475569;
        }
        .footer-action {
            text-align: center;
            font-style: italic;
            color: #64748b;
            margin-bottom: 30px;
            font-size: 15px;
        }
        .email-footer {
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
            font-size: 13px;
            color: #94a3b8;
        }
        .email-footer strong {
            color: #0f172a;
            font-size: 15px;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <div style="text-align: center; margin-bottom: 25px;">
                @if(file_exists(public_path('logo.png')))
                    <img src="{{ $message->embed(public_path('logo.png')) }}" alt="E-Tech Market Logo" style="max-height: 55px; margin: 0 auto; display: block;">
                @else
                    <h1 style="color: #2563eb; margin: 0; letter-spacing: 2px;">E-TECH MARKET</h1>
                @endif
            </div>
            <h2>Chào {{ $req->customer_name }},</h2>
            @if($req->status === 'quoted')
                <p>Tin vui! Chúng tôi đã hoàn tất xem xét và định giá sản phẩm của bạn.</p>
            @elseif($req->status === 'rejected')
                <p>Cảm ơn bạn đã gửi yêu cầu. Chúng tôi đã xem xét kỹ sản phẩm của bạn.</p>
            @endif
        </div>

        <div class="email-body">
            @if($req->status === 'quoted')
                <div class="price-box">
                    <div class="price-label">GIÁ THU MUA DỰ KIẾN</div>
                    <h1 class="price-value">{{ number_format($req->estimated_price, 0, ',', '.') }} đ</h1>
                </div>
            @elseif($req->status === 'rejected')
                <div class="rejected-box">
                    <h1 class="rejected-value">Không thể thu mua</h1>
                </div>
            @endif

            <div class="section-title">
                <span style="font-size: 16px;">ⓘ</span> CHI TIẾT SẢN PHẨM
            </div>
            <div class="product-details">
                <div style="white-space: pre-wrap;">{{ $req->machine_info }}</div>
            </div>

            <div class="section-title">
                <span style="font-size: 16px;">✎</span> GHI CHÚ TỪ BỘ PHẬN KỸ THUẬT
            </div>
            <div class="note-container">
                @if($req->status === 'quoted')
                    <p class="note-desc">Cảm ơn Quý khách đã gửi yêu cầu thu cũ tại E-Tech Market. Sau khi xem xét thông tin và hình ảnh sản phẩm, cửa hàng tạm định giá thu mua {{ number_format($req->estimated_price, 0, ',', '.') }} VNĐ.</p>
                @else
                    <p class="note-desc">Rất tiếc, sau khi xem xét thông tin và hình ảnh bạn cung cấp, chúng tôi không thể thu mua sản phẩm này ở thời điểm hiện tại.</p>
                @endif
                
                @if($req->admin_note)
                <div class="note-box">
                    <strong>Lưu ý về tình trạng hiện tại:</strong>
                    <div class="note-content">{{ $req->admin_note }}</div>
                </div>
                @endif

                @if($req->status === 'quoted')
                <p class="note-desc">Mức giá sẽ được xác nhận cuối cùng sau khi kỹ thuật kiểm tra trực tiếp để đánh giá ngoại hình, màn hình, chức năng, bo mạch, pin... Nếu tình trạng thực tế đúng như mô tả, cửa hàng sẽ thu mua theo mức giá trên.</p>
                @endif
            </div>

            @if($req->status === 'quoted')
            <div class="footer-action">
                Vui lòng mang máy đến cửa hàng E-Tech Market gần nhất để được kiểm tra thực tế và nhận tiền hoặc lên đời máy mới nhé!
            </div>
            @endif

            <div class="email-footer">
                <p style="margin-bottom: 5px;">Cảm ơn bạn đã tin tưởng và sử dụng dịch vụ của E-Tech Market!</p>
                <p style="margin: 0;">Regards,<br><strong>E-Tech Market Team</strong></p>
            </div>
        </div>
    </div>
</body>
</html>
