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
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.07);
        }
        .email-header {
            padding: 30px 30px 10px 30px;
        }
        .email-header h2 {
            margin: 0;
            color: #0f172a;
            font-size: 22px;
        }
        .email-body {
            padding: 0 30px 30px 30px;
        }
        /* ── Quoted box ── */
        .price-box {
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            border-radius: 12px;
            padding: 25px;
            text-align: center;
            margin: 25px 0;
            border: 1px solid #bfdbfe;
        }
        .price-label {
            color: #3b82f6;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            margin-bottom: 10px;
        }
        .price-value {
            color: #1d4ed8;
            font-size: 34px;
            font-weight: bold;
            margin: 0;
        }
        /* ── Rejected box ── */
        .rejected-box {
            background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
            border-radius: 12px;
            padding: 28px 25px;
            text-align: center;
            margin: 25px 0;
            border: 1px solid #fca5a5;
        }
        .rejected-icon {
            font-size: 36px;
            margin-bottom: 10px;
            display: block;
        }
        .rejected-value {
            color: #dc2626;
            font-size: 22px;
            font-weight: bold;
            margin: 0 0 6px 0;
        }
        .rejected-sub {
            color: #b91c1c;
            font-size: 13px;
            margin: 0;
            opacity: 0.8;
        }
        /* ── Divider ── */
        .section-title {
            font-size: 12px;
            font-weight: 700;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 1.2px;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .product-details {
            background-color: #f8fafc;
            border-radius: 10px;
            padding: 18px 20px;
            margin-bottom: 28px;
            font-size: 14px;
            border: 1px solid #e2e8f0;
        }
        .product-details p {
            margin: 0 0 8px 0;
        }
        .product-details p:last-child {
            margin-bottom: 0;
        }
        /* ── Rejection reasons card ── */
        .rejection-reasons {
            background: #fff7f7;
            border-radius: 10px;
            border: 1px solid #fecaca;
            padding: 20px;
            margin-bottom: 20px;
        }
        .rejection-reasons-title {
            color: #b91c1c;
            font-size: 13px;
            font-weight: 700;
            margin: 0 0 12px 0;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .rejection-reasons-list {
            margin: 0;
            padding: 0;
            list-style: none;
        }
        .rejection-reasons-list li {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            font-size: 14px;
            color: #7f1d1d;
            padding: 5px 0;
            border-bottom: 1px solid #fee2e2;
        }
        .rejection-reasons-list li:last-child {
            border-bottom: none;
            padding-bottom: 0;
        }
        .rejection-reasons-list li::before {
            content: '✕';
            color: #ef4444;
            font-weight: bold;
            flex-shrink: 0;
            margin-top: 1px;
        }
        /* ── Admin note ── */
        .note-container {
            margin-bottom: 28px;
        }
        .note-box {
            background-color: #fefce8;
            border: 1px solid #fef08a;
            border-radius: 8px;
            padding: 16px 20px;
            margin: 14px 0;
        }
        .note-box strong {
            color: #b45309;
            display: block;
            margin-bottom: 8px;
            font-size: 13px;
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
            margin-bottom: 0;
        }
        /* ── What's next for rejected ── */
        .next-steps {
            background: #f0f9ff;
            border-radius: 10px;
            border: 1px solid #bae6fd;
            padding: 20px;
            margin-bottom: 28px;
        }
        .next-steps-title {
            color: #0369a1;
            font-size: 13px;
            font-weight: 700;
            margin: 0 0 12px 0;
        }
        .next-steps-list {
            margin: 0;
            padding: 0;
            list-style: none;
        }
        .next-steps-list li {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            font-size: 14px;
            color: #0c4a6e;
            padding: 6px 0;
        }
        .next-steps-list li .step-num {
            background: #0ea5e9;
            color: white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 700;
            flex-shrink: 0;
        }
        /* ── Footer action ── */
        .footer-action {
            text-align: center;
            font-style: italic;
            color: #64748b;
            margin-bottom: 28px;
            font-size: 14px;
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 10px;
            padding: 16px;
        }
        /* ── Email footer ── */
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
        .divider {
            border: none;
            border-top: 1px solid #e2e8f0;
            margin: 24px 0;
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
                <p>🎉 Tin vui! Chúng tôi đã hoàn tất xem xét và định giá sản phẩm của bạn.</p>
            @elseif($req->status === 'rejected')
                <p>Cảm ơn bạn đã tin tưởng gửi yêu cầu thu cũ đến E-Tech Market. Chúng tôi đã xem xét kỹ thông tin và hình ảnh sản phẩm của bạn.</p>
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
                    <span class="rejected-icon">😔</span>
                    <h1 class="rejected-value">Rất tiếc, chúng tôi không thể thu mua</h1>
                    <p class="rejected-sub">Yêu cầu #{{ $req->request_code }} — {{ \Carbon\Carbon::parse($req->created_at)->format('d/m/Y') }}</p>
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
                    <p class="note-desc">Cảm ơn Quý khách đã gửi yêu cầu thu cũ tại E-Tech Market. Sau khi xem xét thông tin và hình ảnh sản phẩm, cửa hàng tạm định giá thu mua <strong>{{ number_format($req->estimated_price, 0, ',', '.') }} VNĐ</strong>.</p>
                @else
                    <p class="note-desc">Sau khi bộ phận kỹ thuật đánh giá toàn diện, chúng tôi chưa thể thu mua sản phẩm này ở thời điểm hiện tại.</p>
                @endif

                @if($req->admin_note)
                <div class="note-box">
                    <strong>{{ $req->status === 'rejected' ? '📋 Lý do từ chối:' : '📋 Lưu ý từ bộ phận kỹ thuật:' }}</strong>
                    <div class="note-content">{{ $req->admin_note }}</div>
                </div>
                @endif

                @if($req->status === 'quoted')
                <p class="note-desc" style="margin-top: 12px;">Mức giá sẽ được xác nhận cuối cùng sau khi kỹ thuật kiểm tra trực tiếp để đánh giá ngoại hình, màn hình, chức năng, bo mạch, pin... Nếu tình trạng thực tế đúng như mô tả, cửa hàng sẽ thu mua theo mức giá trên.</p>
                @endif
            </div>

            @if($req->status === 'rejected')
            <div class="section-title">
                <span style="font-size: 16px;">💡</span> BẠN CÓ THỂ LÀM GÌ TIẾP THEO?
            </div>
            <div class="next-steps">
                <ul class="next-steps-list">
                    <li>
                        <span class="step-num">1</span>
                        <span>Mang máy đến trực tiếp cửa hàng để được kiểm tra thực tế và nhận tư vấn chuyên sâu hơn.</span>
                    </li>
                    <li>
                        <span class="step-num">2</span>
                        <span>Gửi lại yêu cầu mới sau khi sửa chữa các lỗi kỹ thuật để được định giá lại ở mức tốt hơn.</span>
                    </li>
                    <li>
                        <span class="step-num">3</span>
                        <span>Liên hệ hotline hoặc live chat để được nhân viên tư vấn phương án phù hợp nhất với nhu cầu của bạn.</span>
                    </li>
                </ul>
            </div>
            @endif

            @if($req->status === 'quoted')
            <div class="footer-action">
                🏪 Vui lòng mang máy đến cửa hàng E-Tech Market gần nhất để được kiểm tra thực tế và nhận tiền hoặc lên đời máy mới nhé!
            </div>
            @endif

            @if($req->status === 'rejected')
            <div style="text-align: center; margin-bottom: 28px; padding: 18px; background: #fafafa; border-radius: 10px; border: 1px solid #e2e8f0;">
                <p style="margin: 0 0 6px 0; font-size: 14px; color: #475569;">Chúng tôi hy vọng sẽ có cơ hội phục vụ bạn trong tương lai.</p>
                <p style="margin: 0; font-size: 13px; color: #94a3b8;">Mọi thắc mắc vui lòng liên hệ: <strong style="color: #334155;">support@etechmarket.vn</strong></p>
            </div>
            @endif

            <div class="email-footer">
                <p style="margin-bottom: 5px;">Cảm ơn bạn đã tin tưởng và sử dụng dịch vụ của E-Tech Market!</p>
                <p style="margin: 0;">Regards,<br><strong>E-Tech Market</strong></p>
            </div>
        </div>
    </div>
</body>
</html>
