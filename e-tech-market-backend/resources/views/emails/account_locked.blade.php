<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tài khoản bị khóa</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f3f4f6;
            margin: 0;
            padding: 0;
            color: #333333;
        }
        .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background-color: #dc2626;
            color: #ffffff;
            text-align: center;
            padding: 24px;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: bold;
        }
        .content {
            padding: 32px 24px;
            line-height: 1.6;
        }
        .content p {
            margin: 0 0 16px;
        }
        .footer {
            background-color: #f9fafb;
            text-align: center;
            padding: 16px;
            font-size: 14px;
            color: #6b7280;
            border-top: 1px solid #e5e7eb;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Tài Khoản Đã Bị Khóa</h1>
        </div>
        <div class="content">
            <p>Xin chào <strong>{{ $userName }}</strong>,</p>
            <p>Chúng tôi xin thông báo rằng tài khoản của bạn tại hệ thống đã bị <strong>khóa</strong> bởi quản trị viên.</p>
            <p>Bạn sẽ không thể đăng nhập vào hệ thống và các phiên đăng nhập hiện tại trên mọi thiết bị đều đã bị đăng xuất.</p>
            <p>Nếu bạn cho rằng đây là một sự nhầm lẫn hoặc cần được hỗ trợ, vui lòng liên hệ với bộ phận chăm sóc khách hàng của chúng tôi.</p>
            <p>Trân trọng,<br>Đội ngũ Hỗ trợ E-Tech Market</p>
        </div>
        <div class="footer">
            &copy; {{ date('Y') }} E-Tech Market. Tất cả các quyền được bảo lưu.
        </div>
    </div>
</body>
</html>
