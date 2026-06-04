<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Đặt lại mật khẩu</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f1ec;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f1ec;padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="520" cellspacing="0" cellpadding="0" style="max-width:520px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          
          {{-- Header --}}
          <tr>
            <td style="background: linear-gradient(135deg, #EF7A45 0%, #F59E0B 100%);padding:32px 40px;text-align:center;">
              <div style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:2px;">E-TECH MARKET</div>
              <div style="font-size:13px;color:rgba(255,255,255,0.85);margin-top:6px;letter-spacing:1px;">CHUỖI BÁN LẺ CÔNG NGHỆ</div>
            </td>
          </tr>

          {{-- Icon --}}
          <tr>
            <td align="center" style="padding:32px 40px 0;">
              <div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#FFF7ED,#FFEDD5);display:inline-flex;align-items:center;justify-content:center;">
                <span style="font-size:36px;">🔐</span>
              </div>
            </td>
          </tr>

          {{-- Title --}}
          <tr>
            <td style="padding:20px 40px 0;text-align:center;">
              <h1 style="margin:0;font-size:22px;font-weight:800;color:#1f2937;">Đặt lại mật khẩu</h1>
              <p style="margin:10px 0 0;font-size:14px;color:#6b7280;line-height:1.6;">
                Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.
              </p>
            </td>
          </tr>

          {{-- Token Code --}}
          <tr>
            <td style="padding:24px 40px 0;">
              <div style="background-color:#FFF7ED;border:2px dashed #F59E0B;border-radius:12px;padding:20px;text-align:center;">
                <div style="font-size:12px;color:#92400E;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px;">
                  Mã xác nhận của bạn
                </div>
                <div style="font-size:14px;font-family:'Courier New',Courier,monospace;color:#1f2937;font-weight:700;word-break:break-all;line-height:1.6;background:#ffffff;border-radius:8px;padding:12px 16px;border:1px solid #e5e7eb;">
                  {{ $token }}
                </div>
                <div style="font-size:11px;color:#9CA3AF;margin-top:10px;">
                  Sao chép mã này và dán vào ứng dụng trên điện thoại
                </div>
              </div>
            </td>
          </tr>

          {{-- Divider --}}
          <tr>
            <td style="padding:24px 40px 0;">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-top:1px solid #e5e7eb;font-size:0;height:1px;">&nbsp;</td>
                </tr>
              </table>
              <div style="text-align:center;margin-top:-10px;">
                <span style="background:#ffffff;padding:0 16px;font-size:12px;color:#9CA3AF;font-weight:600;">HOẶC</span>
              </div>
            </td>
          </tr>

          {{-- Button --}}
          <tr>
            <td align="center" style="padding:20px 40px 0;">
              <p style="font-size:13px;color:#6b7280;margin:0 0 16px;">Nếu bạn đang dùng máy tính, bấm nút bên dưới:</p>
              <a href="{{ $resetUrl }}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#EF7A45,#F59E0B);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 40px;border-radius:12px;letter-spacing:1px;">
                ĐẶT LẠI MẬT KHẨU
              </a>
            </td>
          </tr>

          {{-- Warning --}}
          <tr>
            <td style="padding:28px 40px 0;">
              <div style="background-color:#FEF2F2;border-radius:10px;padding:14px 16px;border-left:4px solid #EF4444;">
                <p style="margin:0;font-size:12px;color:#991B1B;line-height:1.5;">
                  <strong>⚠️ Lưu ý:</strong> Mã này sẽ hết hạn sau 60 phút. Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
                </p>
              </div>
            </td>
          </tr>

          {{-- Footer --}}
          <tr>
            <td style="padding:28px 40px 32px;text-align:center;border-top:1px solid #f3f4f6;margin-top:24px;">
              <p style="margin:0;font-size:11px;color:#9CA3AF;line-height:1.6;">
                Email này được gửi tự động từ <strong style="color:#6b7280;">E-Tech Market</strong>.<br>
                Vui lòng không trả lời email này.
              </p>
              <p style="margin:12px 0 0;font-size:11px;color:#D1D5DB;">
                © {{ date('Y') }} E-Tech Market. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
