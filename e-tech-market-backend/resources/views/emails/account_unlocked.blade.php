<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Mở khóa tài khoản</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <h2>Xin chào {{ $userName }},</h2>
    
    <p>Tài khoản của bạn đã được Admin chấp nhận mở lại.</p>
    
    <p>Vui lòng nhấn vào nút bên dưới để tạo mật khẩu mới. Liên kết này có hiệu lực trong <strong>15 phút</strong>.</p>
    
    <div style="margin: 30px 0;">
        <a href="{{ $resetUrl }}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Tạo mật khẩu mới
        </a>
    </div>
    
    <p>Hoặc bạn có thể sao chép và dán đường dẫn sau vào trình duyệt:</p>
    <p><a href="{{ $resetUrl }}">{{ $resetUrl }}</a></p>
    
    <p>Nếu bạn không yêu cầu mở khóa tài khoản, vui lòng bỏ qua email này.</p>
    
    <p>Trân trọng,<br>Đội ngũ E-Tech Market</p>
</body>
</html>
