# 🛒 E-Tech Market — Hệ Thống Thương Mại Điện Tử Thiết Bị Công Nghệ Cao Cấp

**E-Tech Market** là một nền tảng thương mại điện tử chuyên biệt dành cho các thiết bị công nghệ và điện tử cao cấp. Dự án được phát triển theo mô hình Full-Stack hiện đại với thiết kế giao diện (UI/UX) vô cùng bắt mắt, hiệu ứng mượt mà và hệ thống quản trị chuyên sâu cùng nhiều giải pháp tích hợp thanh toán phổ biến tại Việt Nam.

Dự án được phân chia thành hai thành phần cốt lõi:
*   **Backend API (Laravel 10)**: Nằm tại thư mục [`e-tech-market-backend`](file:///d:/E-Tech-Market/e-tech-market-backend), đóng vai trò cung cấp RESTful API bảo mật và quản lý hàng đợi (queues).
*   **Frontend SPA (React, TypeScript & Vite)**: Nằm tại thư mục [`e-tech-market-frontend`](file:///d:/E-Tech-Market/e-tech-market-frontend), mang lại trải nghiệm mượt mà, phản hồi ngay lập tức với ngôn ngữ Vanilla CSS tùy biến cao cấp.

---

## 💎 Các Tính Năng Nổi Bật

### 🌐 Trải Nghiệm Khách Hàng (Client SPA)
*   **Trang chủ ấn tượng**: Banner chuyển động mượt mà, danh mục sản phẩm trực quan, danh sách sản phẩm nổi bật cùng khu vực **Flash Sale** đếm ngược thời gian thực.
*   **Bộ lọc sản phẩm thông minh**: Lọc sản phẩm đa chiều theo giá, danh mục, thương hiệu, đánh giá và trạng thái kho hàng kèm phân trang động.
*   **Trang chi tiết sản phẩm tối ưu**:
    *   Thư viện ảnh sản phẩm zoom/slider chất lượng cao.
    *   Thông số kỹ thuật chi tiết theo dạng bảng chuyên nghiệp.
    *   Hệ thống đánh giá sản phẩm trực quan (hiển thị biểu đồ phân bố sao, bộ lọc đánh giá kèm hình ảnh thực tế).
    *   Mục **Hỏi & Đáp (Shop Q&A)** giúp khách hàng tương tác trực tiếp với cửa hàng.
*   **Công cụ so sánh sản phẩm (Compare System)**: Cho phép chọn tối đa 3 sản phẩm cùng lúc để so sánh thông số chi tiết thông qua một thanh khay chứa tiện lợi (Compare Tray).
*   **Giỏ hàng & Thanh toán tối ưu**: Tích hợp các phương thức thanh toán phổ biến như **MoMo**, **VNPAY** và **COD** (Thanh toán khi nhận hàng).
*   **Trang cá nhân toàn diện**:
    *   Quản lý đơn hàng (theo dõi trạng thái chi tiết của từng đơn).
    *   Ví Voucher / Coupon (quản lý mã giảm giá khả dụng).
    *   Bảo mật tài khoản (đổi mật khẩu nâng cao).
    *   Hệ thống thông báo đồng bộ thời gian thực.
*   **Tin tức & Blog**: Các bài viết công nghệ mới nhất giúp tối ưu SEO và tương tác với khách hàng.

### 🛡️ Hệ Thống Quản Trị Chuyên Sâu (Admin Console `/admin`)
Hệ thống phân quyền thông minh cho phép các vai trò khác nhau như **Admin**, **Warehouse Staff** (Nhân viên kho), **Order Staff** (Nhân viên xử lý đơn), và **Editor** (Biên tập viên bài viết) thực hiện nhiệm vụ một cách an toàn:
*   **Bảng điều khiển (Dashboard)**: Tổng hợp các chỉ số tài chính, doanh thu thực tế, số lượng đơn hàng mới, biểu đồ tăng trưởng và cảnh báo hàng tồn kho thấp.
*   **Quản lý danh mục & Sản phẩm**:
    *   Hỗ trợ sản phẩm nhiều biến thể (màu sắc, cấu hình, dung lượng) kèm hình ảnh và giá riêng biệt.
    *   Quản lý thương hiệu và danh mục đa cấp.
*   **Hệ thống xử lý đơn hàng**: Luồng xử lý đơn hàng chuyên nghiệp từ Chờ xác nhận ➜ Đang chuẩn bị hàng ➜ Đang giao ➜ Đã giao / Đã hủy.
*   **Chiến dịch ưu đãi & Khuyến mãi**:
    *   Thiết lập mã giảm giá (Coupon) theo phần trăm hoặc số tiền cố định kèm hạn mức sử dụng.
    *   Tạo chiến dịch **Flash Sale** giới hạn thời gian và số lượng sản phẩm bán ra.
*   **Kiểm duyệt & Chăm sóc khách hàng**:
    *   Phê duyệt đánh giá/bình luận của khách hàng.
    *   Phản hồi câu hỏi ở mục Hỏi & Đáp.
    *   Xem danh sách đăng ký nhận tin bản tin (Newsletter) và liên hệ từ khách hàng.
*   **Cài đặt hệ thống nâng cao**:
    *   Bật/Tắt **Chế độ bảo trì (Maintenance Mode)** toàn hệ thống chỉ với 1 click (chỉ tài khoản quản trị mới có quyền truy cập khi kích hoạt chế độ này).
    *   Thay đổi logo, thông tin cửa hàng, cổng chat hỗ trợ khách hàng.

---

## 🛠️ Công Nghệ Sử Dụng

| Thành Phần | Công Nghệ & Thư Viện Cốt Lõi |
| :--- | :--- |
| **Frontend** | React 18, Vite, TypeScript, React Router Dom v6, Vanilla CSS (Premium & Custom UI Design), Redux Toolkit (state management) |
| **Backend** | Laravel 10, Eloquent ORM, RESTful API |
| **Database** | PostgreSQL 15, Redis (cho Cache & Session) |
| **Hàng Đợi** | Laravel Queue Worker (`database` driver cho các tác vụ gửi email bất đồng bộ) |
| **Container** | Docker & Docker Compose |

---

## ⚙️ Hướng Dẫn Cài Đặt (Local Environment)

### 📋 Yêu cầu hệ thống
*   **PHP 8.1 trở lên**
*   **Composer** (Trình quản lý gói PHP)
*   **Node.js (v18+) & npm**
*   **PostgreSQL** (Nếu chạy trực tiếp trên máy chủ vật lý)

---

### 💻 Cách 1: Chạy trực tiếp trên máy vật lý (Host Machine)

#### 1. Thiết lập Backend API
Di chuyển vào thư mục backend và tiến hành cài đặt:
```bash
cd e-tech-market-backend
composer install
cp .env.example .env
php artisan key:generate
```

Mở tệp `.env` vừa tạo và cấu hình thông tin kết nối Database cùng các đường dẫn của bạn:
```env
APP_NAME="E-Tech Market"
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE="E-Tech Market"
DB_USERNAME=postgres
DB_PASSWORD=mat_khau_postgres_cua_ban
```

Khởi tạo cấu trúc bảng và nạp dữ liệu mẫu (sản phẩm, tài khoản mẫu):
```bash
# 1. Tạo database "E-Tech Market" trong pgAdmin / PostgreSQL của bạn trước.
# 2. Chạy lệnh sau để import cấu trúc database:
psql -U postgres -d "E-Tech Market" -f database/schema-postgres.sql

# 3. Chạy lệnh sau để import dữ liệu mẫu chất lượng cao:
psql -U postgres -d "E-Tech Market" -f database/seed-postgres.sql
```

> [!NOTE]
> Nếu bạn chỉ cập nhật các tính năng mới mà không muốn import lại từ đầu, hãy chạy lệnh migration tiêu chuẩn của Laravel:
> `php artisan migrate`

Liên kết thư mục upload hình ảnh để hiển thị ảnh sản phẩm, avatar:
```bash
php artisan storage:link
```
*(Trên Windows, lệnh này sẽ tạo một Junction Link liên kết thư mục `storage` và `public` giúp xử lý triệt để lỗi không tải được ảnh trên local).*

Khởi chạy Laravel Server:
```bash
cd e-tech-market-backend
php artisan serve
```
Backend API sẽ hoạt động tại địa chỉ: `http://localhost:8000`.

#### 2. Thiết lập Frontend SPA
Di chuyển vào thư mục frontend và cài đặt các thư viện Node.js:
```bash
cd e-tech-market-frontend
npm install
```

*(Tùy chọn)* Cấu hình biến môi trường bằng cách tạo tệp `.env` tại thư mục frontend:
```env
VITE_API_BASE_URL=http://localhost:8000
```

Khởi chạy Vite Development Server:
```bash
cd e-tech-market-frontend
npm run dev
```
Giao diện người dùng sẽ sẵn sàng tại địa chỉ: `http://localhost:5173`.

---

### 🐳 Cách 2: Triển khai nhanh chóng bằng Docker (Khuyên Dùng)

Hệ thống được đóng gói hoàn chỉnh bằng Docker giúp bạn có thể khởi chạy toàn bộ dịch vụ (Frontend, Backend, PostgreSQL, Redis và Queue Worker) chỉ với một câu lệnh duy nhất.

#### 1. Khởi chạy các Containers
Tại thư mục gốc của dự án (nơi chứa file `docker-compose.yml`), chạy lệnh:
```bash
docker-compose up -d --build
```
Sau khi các Container khởi động thành công:
*   **Giao diện người dùng (React SPA)**: `http://localhost:5173`
*   **Hệ thống RESTful API (Laravel)**: `http://localhost:8000`
*   **Cơ sở dữ liệu (PostgreSQL)**: `localhost:5432`
*   **Bộ nhớ đệm (Redis)**: `localhost:6379`

#### 2. Đồng bộ dữ liệu thực tế vào môi trường Docker (Windows Only)
Dự án đi kèm các tệp kịch bản tự động giúp đồng bộ và sao lưu dữ liệu nhanh chóng:

*   **Sao lưu dữ liệu từ máy Host**: Chạy file `export_database.bat` để sao lưu toàn bộ dữ liệu thực tế trên máy host thành file `database_real_data_backup.sql` ở thư mục gốc.
*   **Nạp dữ liệu thực tế vào Docker**: 
    1. Đảm bảo các container Docker đang chạy (`docker-compose up -d`).
    2. Click đúp chuột chạy file **`import_database.bat`**.
    3. Chương trình sẽ tự động dọn dẹp database cũ trong Docker và nạp dữ liệu từ file sao lưu `database_real_data_backup.sql` vào cơ sở dữ liệu `etech` trong Docker mà **không làm mất định dạng tiếng Việt UTF-8**.

---

## 🔄 Hệ Thống Hàng Đợi (Queue Worker)

Hệ thống sử dụng cơ chế hàng đợi bất đồng bộ để gửi các email xác thực tài khoản, hóa đơn mua hàng nhằm nâng cao hiệu năng phản hồi của ứng dụng.

*   **Môi trường phát triển (Local)**: Bạn cần bật một terminal riêng và chạy lệnh sau để xử lý hàng đợi:
    ```bash
    cd e-tech-market-backend
    php artisan queue:work
    ```
*   **Môi trường sản xuất (Production)**: Khuyến nghị sử dụng công cụ **Supervisor** để giám sát và giữ cho tiến trình hàng đợi chạy liên tục.

### Cấu hình Supervisor mẫu (Linux / Ubuntu)
Tạo file cấu hình tại đường dẫn `/etc/supervisor/conf.d/etech-worker.conf`:
```ini
[program:etech-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/etech/e-tech-market-backend/artisan queue:work --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/var/www/etech/e-tech-market-backend/storage/logs/worker.log
stopwaitsecs=3600
```

Kích hoạt cấu hình Supervisor:
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start etech-worker:*
```

---

## 💳 Tài Khoản Thử Nghiệm Thanh Toán Sandbox

Bạn có thể sử dụng các tài khoản thử nghiệm sau để thực hiện quy trình mua sắm và thanh toán mô phỏng:

### 📱 Cổng Thanh Toán MoMo (Ví Thử Nghiệm)
*   **Số thẻ/Số tài khoản**: `9704 0000 0000 0018`
*   **Ngày phát hành**: `03/07`
*   **Tên chủ thẻ**: `NGUYEN VAN A`
*   **Số điện thoại**: Một số điện thoại bất kỳ (Ví dụ: `0901234567`)
*   **Mã OTP**: Nhập chính xác chuỗi ký tự **`OTP`** tại ô nhập mã OTP trên màn hình thanh toán.

### 🏦 Cổng Thanh Toán VNPAY (Thẻ ATM Nội Địa)
*   **Ngân hàng**: Chọn ngân hàng **`NCB`** trên cổng VNPAY.
*   **Số thẻ**: `9704198526191432198`
*   **Tên chủ thẻ**: `NGUYEN VAN A`
*   **Ngày phát hành**: `07/15`
*   **Mã OTP**: `123456`

---

## 🧪 Kiểm Thử & Đảm Bảo Chất Lượng Code

### Kiểm thử tự động Backend (Laravel Tests)
Chạy bộ kiểm thử (Feature & Unit tests) của Laravel để đảm bảo các API hoạt động chính xác:
```bash
cd e-tech-market-backend
php artisan test
```

### Kiểm tra Code Style & Build thử Frontend
Kiểm tra lỗi cú pháp TypeScript và tạo bản build sản phẩm tối ưu:
```bash
cd e-tech-market-frontend
npm run lint
npm run build
```

---

## ⚠️ Lưu Ý & Bảo Mật
*   **Không bao giờ** cam kết (commit) các thông tin nhạy cảm thực tế (như mật khẩu DB, khóa bảo mật MoMo/VNPAY) lên GitHub. Luôn đưa tệp `.env` vào danh sách `.gitignore`.
*   Khi chạy trên Windows, hãy đảm bảo bạn có quyền Administrator khi chạy lệnh `php artisan storage:link` lần đầu để tránh các lỗi liên kết thư mục.
