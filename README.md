# 🛒 E-Tech Market — Hệ Thống Thương Mại Điện Tử Thiết Bị Công Nghệ Cao Cấp

**E-Tech Market** là một hệ sinh thái thương mại điện tử đa nền tảng chuyên biệt dành cho các thiết bị công nghệ cao cấp. Dự án được phát triển theo mô hình **Headless Commerce**, tách biệt giữa tầng dữ liệu và tầng hiển thị, cho phép vận hành đồng thời trên Web và Mobile App với trải nghiệm đồng nhất.

Dự án được phân chia thành hai thành phần cốt lõi:

- **Backend API (Laravel 10)**: Nằm tại thư mục [`e-tech-market-backend`](file:///d:/E-Tech-Market/e-tech-market-backend), cung cấp hệ thống RESTful API an toàn, xử lý hàng đợi (queues) gửi thư và quản trị hệ thống.
- **Frontend SPA (React, TypeScript & Vite)**: Nằm tại thư mục [`e-tech-market-frontend`](file:///d:/E-Tech-Market/e-tech-market-frontend), mang lại trải nghiệm khách hàng mượt mà bằng việc tối ưu hóa hiệu năng render qua ngôn ngữ **Vanilla CSS Premium**.
- **Mobile App (Flutter)**: Nằm tại thư mục `e_tech_market_app`, cung cấp ứng dụng di động bản địa (Native) cho iOS và Android, tối ưu cho trải nghiệm mua sắm cầm tay.

---

## 📑 Mục Lục
- [📂 Cấu Trúc Thư Mục Tổng Quan](#-cấu-trúc-thư-mục-tổng-quan)
- [💎 Các Tính Năng Nổi Bật & Giải Pháp Kỹ Thuật](#-các-tính-năng-nổi-bật--giải-pháp-kỹ-thuật)
- [🛠️ Công Nghệ Sử Dụng](#️-công-nghệ-sử-dụng)
- [🚀 Hướng Dẫn Cài Đặt Dự Án Trên Máy Mới](#-hướng-dẫn-cài-đặt-dự-án-trên-máy-mới-step-by-step-setup-guide)
- [⚙️ Cẩm Nang Lệnh](#️-cẩm-nang-lệnh-dành-cho-backend-laravel-10)
- [💾 Hướng Dẫn Đồng Bộ Dữ Liệu PostgreSQL](#-hướng-dẫn-đồng-bộ-dữ-liệu-postgresql-độc-quyền-dành-cho-windows)
- [🔑 Tài Khoản Kiểm Thử Hệ Thống (Test Accounts)](#-tài-khoản-kiểm-thử-hệ-thống-test-accounts)
- [💳 Tài Khoản Thử Nghiệm Thanh Toán Sandbox (Demo)](#-tài-khoản-thử-nghiệm-thanh-toán-sandbox-demo)
- [🛠️ Khắc Phục Lỗi Thường Gặp (Troubleshooting)](#️-khắc-phục-lỗi-thường-gặp-troubleshooting)
- [📜 Bản Quyền & Liên Hệ](#-bản-quyền--liên-hệ)

---

## 📂 Cấu Trúc Thư Mục Tổng Quan

```text
E-Tech-Market/
├── e-tech-market-backend/     # Backend API (Laravel 10, PostgreSQL)
├── e-tech-market-frontend/    # Frontend Web Client & Admin Panel (React, Vite)
├── e_tech_market_app/         # Mobile App cho người dùng (Flutter)
├── docker/                    # Cấu hình giám sát hệ thống (Prometheus, Grafana)
├── database_real_data_backup_utf8.sql  # Backup CSDL mẫu với cấu hình chuẩn UTF-8
├── docker-compose.yml         # File khởi chạy toàn bộ dịch vụ ảo hóa (Docker)
└── import_database.bat / export_database.bat # Script tự động import/export dữ liệu nhanh
```

---

## 💎 Các Tính Năng Nổi Bật & Giải Pháp Kỹ Thuật

### 🌐 Trải Nghiệm Khách Hàng (Client SPA)

- **Trang chủ ấn tượng**: Banner chuyển động mượt mà, danh mục sản phẩm trực quan, danh sách sản phẩm nổi bật cùng khu vực **Flash Sale** đếm ngược thời gian thực.
- **Bộ lọc sản phẩm thông minh**: Lọc sản phẩm đa chiều theo giá, danh mục, thương hiệu, đánh giá và trạng thái kho hàng kèm phân trang động.
- **Trang chi tiết sản phẩm tối ưu**:
  - Thư viện ảnh sản phẩm zoom/slider chất lượng cao, tích hợp cả video đánh giá.
  - Thông số kỹ thuật chi tiết theo dạng bảng chuyên nghiệp (hỗ trợ hiển thị thông số chung hoặc thông số riêng cho từng biến thể sản phẩm).
  - **Bộ soạn thảo Nội dung Chi tiết Đa năng (WYSIWYG Dual Editor)**: Tự động nhận diện chuỗi dữ liệu. Nếu chứa mã HTML thì render thành định dạng đa phương tiện (HTML); nếu là văn bản viết tay thông thường thì tự động áp dụng `white-space: pre-wrap` để giữ nguyên các khoảng cách thụt lề, khoảng trắng và các dòng xuống dòng (`\n`).
  - Hệ thống đánh giá sản phẩm trực quan (hiển thị biểu đồ phân bố sao, bộ lọc đánh giá kèm hình ảnh thực tế).
  - Mục **Hỏi & Đáp (Shop Q&A)** giúp khách hàng tương tác trực tiếp với cửa hàng.
- **Công cụ so sánh sản phẩm (Compare System)**: Cho phép chọn tối đa 3 sản phẩm cùng lúc để so sánh thông số chi tiết thông qua một thanh khay chứa tiện lợi (Compare Tray).
- **Giỏ hàng & Thanh toán tối ưu**: Tích hợp các phương thức thanh toán phổ biến như **MoMo**, **VNPAY** và **COD** (Thanh toán khi nhận hàng).
- **Trang cá nhân toàn diện**:
  - Quản lý đơn hàng (theo dõi trạng thái chi tiết của từng đơn).
  - Ví Voucher / Coupon (quản lý mã giảm giá khả dụng).
  - Bảo mật tài khoản (đổi mật khẩu nâng cao).
  - Hệ thống thông báo đồng bộ thời gian thực.
- **Hệ thống Video độc lập**: Tích hợp danh mục video độc lập (`video_categories`) giúp tách rời và quản lý nội dung video đánh giá công nghệ mà không bị xung đột với bộ lọc danh mục sản phẩm.

### 📱 Trải Nghiệm Ứng Dụng Di Động (Mobile App)

- **Native UI**: Giao diện thiết kế theo phong cách hiện đại, tối ưu cho thao tác chạm và vuốt.
- **Tích hợp đầy đủ chính sách**: Các màn hình tra cứu nhanh về Chính sách bảo mật thanh toán, Chính sách 1 đổi 1, Chính sách khiếu nại và Giới thiệu thương hiệu.
- **Kết nối API thời gian thực**: Đồng bộ dữ liệu cửa hàng (liên hệ, sản phẩm) trực tiếp từ Admin Console.
- **Hỗ trợ đa nền tảng**: Một bộ mã nguồn duy nhất cho cả Android và iOS nhờ sức mạnh của Flutter.
- **Tính năng hướng khách hàng**: Xem thông tin liên hệ Hotline, Email chuyên trách ngay trên ứng dụng.

### 🛡️ Hệ Thống Quản Trị Chuyên Sâu (Admin Console `/admin`)

Hệ thống phân quyền thông minh cho phép các vai trò khác nhau như **Admin**, **Warehouse Staff** (Nhân viên kho), **Order Staff** (Nhân viên xử lý đơn), và **Editor** (Biên tập viên bài viết) thực hiện nhiệm vụ một cách an toàn:

- **Bảng điều khiển (Dashboard)**: Tổng hợp các chỉ số tài chính, doanh thu thực tế, số lượng đơn hàng mới, biểu đồ tăng trưởng và cảnh báo hàng tồn kho thấp.
- **Quản lý danh mục & Sản phẩm**:
  - Hỗ trợ sản phẩm nhiều biến thể (màu sắc, cấu hình, dung lượng) kèm hình ảnh và giá riêng biệt.
  - Quản lý thương hiệu và danh mục đa cấp.
- **Hệ thống xử lý đơn hàng**: Luồng xử lý đơn hàng chuyên nghiệp từ Chờ xác nhận ➜ Đang chuẩn bị hàng ➜ Đang giao ➜ Đã giao / Đã hủy.
- **Chiến dịch ưu đãi & Khuyến mãi**:
  - Thiết lập mã giảm giá (Coupon) theo phần trăm hoặc số tiền cố định kèm hạn mức sử dụng.
  - Tạo chiến dịch **Flash Sale** giới hạn thời gian và số lượng sản phẩm bán ra.
- **Kiểm duyệt & Chăm sóc khách hàng**:
  - Phê duyệt đánh giá/bình luận của khách hàng.
  - Phản hồi câu hỏi ở mục Hỏi & Đáp.
  - Xem danh sách đăng ký nhận tin bản tin (Newsletter) và liên hệ từ khách hàng.
- **Cài đặt hệ thống nâng cao**:
  - Bật/Tắt **Chế độ bảo trì (Maintenance Mode)** toàn hệ thống chỉ với 1 click (chỉ tài khoản quản trị mới có quyền truy cập khi kích hoạt chế độ này).
  - Thay đổi logo, thông tin cửa hàng, cổng chat hỗ trợ khách hàng.

---

## 🛠️ Công Nghệ Sử Dụng

| Thành Phần     | Công Nghệ & Thư Viện Cốt Lõi                                                                                          |
| :------------- | :-------------------------------------------------------------------------------------------------------------------- |
| **Frontend**   | React 19, Vite, TypeScript, React Router Dom v6, Vanilla CSS (Premium & Custom UI Design), Zustand (state management) |
| **Mobile App** | Flutter 3.24+, Dart, Http/Dio Client, Material Design 3, Shared Preferences (Local Storage)                           |
| **Backend**    | Laravel 10, Eloquent ORM, RESTful API                                                                                 |
| **Database**   | PostgreSQL 15, Redis (cho Cache & Session)                                                                            |
| **Hàng Đợi**   | Laravel Queue Worker (`database` driver cho các tác vụ gửi email bất đồng bộ)                                         |
| **Container**  | Docker & Docker Compose                                                                                               |

---

## 🚀 Hướng Dẫn Cài Đặt Dự Án Trên Máy Mới (Step-by-Step Setup Guide)

Phần này hướng dẫn bạn cách khởi chạy dự án từ con số không trên một máy tính mới hoàn toàn.

### 📋 Yêu Cầu Môi Trường (Prerequisites)

Đảm bảo máy tính của bạn đã cài đặt sẵn các phần mềm sau:

- **PHP 8.1+** & **Composer**
- **Node.js 18+** & **npm**
- **PostgreSQL 15+**
- **Docker Desktop** (Tùy chọn, rất khuyến khích dùng để khởi chạy DB, Redis nhanh)
- **Flutter SDK** (Chỉ cần thiết nếu bạn muốn chạy ứng dụng Mobile)

### Bước 1: Clone Mã Nguồn Dự Án

```bash
git clone <repository_url>
cd E-Tech-Market
```

### Bước 2: Khởi Tạo Cơ Sở Dữ Liệu & Dữ Liệu Mẫu

Dự án đi kèm với dữ liệu thực tế cực kỳ đầy đủ. Bạn có thể thiết lập DB bằng **1 trong 2 cách**:

**Cách A: Sử dụng Docker (Khuyến khích)**

1. Mở terminal tại thư mục gốc `E-Tech-Market`.
2. Khởi chạy toàn bộ hệ thống container:
   ```bash
   docker-compose up -d
   ```
3. Nhấp đúp vào file `import_database.bat` để tự động đẩy dữ liệu thực tế vào database trong Docker.

**Cách B: Sử dụng PostgreSQL cài đặt cục bộ (Local)**

1. Mở công cụ quản lý DB (như pgAdmin hoặc DBeaver).
2. Tạo một database mới (ví dụ: `etech_market`).
3. Khôi phục dữ liệu bằng file `database_real_data_backup_utf8.sql` ở thư mục gốc của dự án.

### Bước 3: Cài Đặt & Cấu Hình Backend (Laravel)

1. Di chuyển vào thư mục backend:
   ```bash
   cd e-tech-market-backend
   ```
2. Cài đặt các thư viện PHP:
   ```bash
   composer install
   ```
3. Tạo file cấu hình môi trường (Mở file `.env` vừa tạo và điền thông tin DB của bạn vào mục `DB_*`):
   ```bash
   cp .env.example .env
   ```
4. Tạo khóa mã hóa ứng dụng:
   ```bash
   php artisan key:generate
   ```
5. Liên kết thư mục hình ảnh (bắt buộc để web hiện ảnh):
   ```bash
   php artisan storage:link
   ```

### Bước 4: Cài Đặt & Cấu Hình Frontend (React + Vite)

1. Mở một terminal khác và di chuyển vào thư mục frontend:
   ```bash
   cd e-tech-market-frontend
   ```
2. Cài đặt các thư viện JavaScript:
   ```bash
   npm install
   ```
3. Tạo file cấu hình và trỏ API về phía Backend (mặc định là `http://127.0.0.1:8000/api`):
   ```bash
   cp .env.example .env
   ```

### Bước 5: Khởi Chạy Hệ Thống

1. **Khởi chạy Web Backend**: Tại terminal thư mục `e-tech-market-backend`:
   ```bash
   php artisan serve
   ```
2. **Khởi chạy Web Frontend**: Tại terminal thư mục `e-tech-market-frontend`:
   ```bash
   npm run dev
   ```
3. **Mở trình duyệt** và truy cập: `http://localhost:5173` để trải nghiệm web app.
   _(Lưu ý: Nếu bạn muốn gửi email xác nhận đặt hàng, hãy mở một terminal mới tại backend và chạy thêm `php artisan queue:work`)_

### Bước 6 (Tùy chọn): Cài Đặt & Khởi Chạy Mobile App (Flutter)

1. Di chuyển vào thư mục ứng dụng di động:
   ```bash
   cd e_tech_market_app
   ```
2. Lấy các gói thư viện:
   ```bash
   flutter pub get
   ```
3. Khởi chạy ứng dụng (thay đổi địa chỉ IP bên dưới thành IP mạng LAN máy tính của bạn, ví dụ: `192.168.1.x`):
   ```bash
   flutter run --dart-define=API_BASE_URL=http://<IP_MAY_TINH_CUA_BAN>:8000/api
   ```

---

## ⚙️ Cẩm Nang Lệnh Dành Cho Backend (Laravel 10)

Thư mục làm việc: `e-tech-market-backend/`

### 1. Lệnh Cài Đặt Ban Đầu

- **Cài đặt dependencies**: Cài đặt toàn bộ các thư viện PHP được định nghĩa trong `composer.json`.
  ```bash
  composer install
  ```
- **Tạo file cấu hình môi trường**: Sao chép file cấu hình mẫu.
  ```bash
  cp .env.example .env
  ```
- **Tạo khóa bảo mật ứng dụng**: Khởi tạo giá trị `APP_KEY` trong file `.env` dùng để mã hóa cookie, session.
  ```bash
  php artisan key:generate
  ```
- **Tối ưu hóa Autoloader**: Tạo lại sơ đồ lớp để tăng tốc độ tải file.
  ```bash
  composer dump-autoload
  ```

### 2. Lệnh Quản Trị Cơ Sở Dữ Liệu (Migrations & Seeders)

- **Chạy migration cơ bản**: Tạo các bảng mới phát sinh trong dự án.
  ```bash
  php artisan migrate
  ```
- **Thu hồi migration gần nhất**: Hủy bỏ lô migration vừa chạy gần nhất.
  ```bash
  php artisan migrate:rollback
  ```
- **Reset và chạy lại toàn bộ Database**: Xóa sạch toàn bộ bảng và chạy lại toàn bộ migrations từ đầu (⚠️ Cực kỳ cẩn thận vì sẽ xóa sạch dữ liệu).
  ```bash
  php artisan migrate:fresh
  ```
- **Đổ dữ liệu mẫu (Seeder)**: Nạp các bản ghi mẫu từ tệp seed của hệ thống vào database.
  ```bash
  php artisan db:seed
  ```
- **Reset database và đổ lại dữ liệu mẫu**:
  ```bash
  php artisan migrate:fresh --seed
  ```

### 3. Lệnh Quản Lý Bộ Nhớ Đệm & Cấu Hình (Caching & Optimization)

Khi chỉnh sửa file `.env` hoặc cập nhật code Route, bạn bắt buộc phải xóa/tạo lại cache để Laravel nhận diện chính xác:

- **Xóa toàn bộ các loại cache**: Dọn sạch cache cấu hình, routes, views.
  ```bash
  php artisan optimize:clear
  ```
- **Tạo cache cho cấu hình (Tăng hiệu năng)**: Gộp các file cấu hình và thông tin từ `.env` thành 1 file duy nhất để đọc nhanh hơn.
  ```bash
  php artisan config:cache
  ```
- **Xóa cache cấu hình**:
  ```bash
  php artisan config:clear
  ```
- **Tạo cache cho Routes**: Gộp toàn bộ sơ đồ định tuyến lại.
  ```bash
  php artisan route:cache
  ```
- **Xóa cache routes**:
  ```bash
  php artisan route:clear
  ```

### 4. Lệnh Vận Hành Hệ Thống Hàng Đợi (Queue Worker)

Hàng đợi được dùng để gửi Email hóa đơn, Email xác nhận tài khoản bất đồng bộ để tránh làm chậm trải nghiệm của khách hàng:

- **Khởi chạy Queue Worker (Local)**: Lắng nghe và thực thi các jobs trong hàng đợi database liên tục.
  ```bash
  php artisan queue:work
  ```
- **Lắng nghe hàng đợi dạng live-reload**: Tự động tải lại code khi có sự thay đổi (tiện dụng trong lúc code).
  ```bash
  php artisan queue:listen
  ```
- **Khởi động lại toàn bộ Workers**: Buộc các tiến trình queue đang chạy ngầm phải khởi động lại (dùng khi bạn vừa sửa code Job gửi email).
  ```bash
  php artisan queue:restart
  ```

### 5. Lệnh Phát Triển & Khởi Chạy

- **Tạo liên kết thư mục hình ảnh (Symlink)**: Cực kỳ quan trọng để hiển thị hình ảnh sản phẩm được upload.
  ```bash
  php artisan storage:link
  ```
- **Khởi chạy Web Server cục bộ**: Khởi chạy Laravel Development Server chạy ở cổng mặc định 8000.
  ```bash
  php artisan serve
  ```
  _Chạy server tại một cổng hoặc IP tùy chọn:_
  ```bash
  php artisan serve --host=0.0.0.0 --port=8080
  ```
- **Tạo nhanh các file mã nguồn mẫu (Scaffolding)**:

  ```bash
  # Tạo Model kèm file Migration
  php artisan make:model Product -m

  # Tạo Controller dạng Resource
  php artisan make:controller Admin/ProductController --resource

  # Tạo Request Validate dữ liệu đầu vào
  php artisan make:request StoreProductRequest
  ```

---

## ⚙️ Cẩm Nang Lệnh Dành Cho Frontend (React, Vite & TypeScript)

Thư mục làm việc: `e-tech-market-frontend/`

### 1. Lệnh Cài Đặt & Phát Triển

- **Cài đặt Node modules**: Cài đặt toàn bộ các thư viện được liệt kê trong `package.json`.
  ```bash
  npm install
  ```
- **Khởi chạy Dev Server**: Khởi động trình biên dịch Vite siêu tốc độ với tính năng Hot Module Replacement (HMR).
  ```bash
  npm run dev
  ```
  _Khởi chạy server công khai trong mạng LAN nội bộ:_
  ```bash
  npm run dev -- --host
  ```

### 2. Lệnh Kiểm Tra Cú Pháp & Biên Dịch (Build Production)

- **Kiểm tra cú pháp TypeScript**: Quét toàn bộ dự án để tìm lỗi kiểu dữ liệu (Types) mà không sinh ra file build.
  ```bash
  npx tsc --noEmit
  ```
- **Biên dịch các packages/dependencies**:
  ```bash
  npx tsc -b
  ```
- **Chạy Linter quét lỗi code style**:
  ```bash
  npm run lint
  ```
- **Biên dịch đóng gói dự án**: Tối ưu hóa dung lượng code CSS/JS, nén và sinh ra thư mục chứa sản phẩm tĩnh `dist/` sẵn sàng triển khai thực tế.
  ```bash
  npm run build
  ```
- **Chạy thử bản Build tĩnh**: Xem trước sản phẩm sau khi nén ngay dưới local máy tính tại cổng mặc định `4173`.
  ```bash
  npm run preview
  ```

---

## ⚙️ Cẩm Nang Lệnh Dành Cho Mobile App (Flutter)

Thư mục làm việc: `e_tech_market_app/`

### 1. Cài đặt & Khởi chạy

- **Kiểm tra môi trường Flutter**: Xác nhận Flutter SDK đã được cài đặt đầy đủ và các dependencies của platform (Android SDK / Xcode) sẵn sàng.
  ```bash
  flutter doctor
  ```
- **Lấy các gói thư viện (Dependencies)**:
  ```bash
  flutter pub get
  ```
- **Chạy ứng dụng (Debug mode)**:
  ```bash
  # Chạy và chỉ định địa chỉ API (Thay IP bằng IP máy chạy Backend của bạn)
  flutter run --dart-define=API_BASE_URL=http://192.168.1.5:8000/api
  ```
- **Chạy trên thiết bị cụ thể**:

  ```bash
  # Liệt kê các thiết bị đang kết nối
  flutter devices

  # Chạy trên một thiết bị cụ thể
  flutter run -d <device_id> --dart-define=API_BASE_URL=http://192.168.1.5:8000/api
  ```

### 2. Build & Đóng Gói Ứng Dụng

- **Build APK (Android - Release)**:
  ```bash
  flutter build apk --release --dart-define=API_BASE_URL=https://api.yourdomain.com/api
  ```
- **Build App Bundle (Android - Google Play)**:
  ```bash
  flutter build appbundle --release --dart-define=API_BASE_URL=https://api.yourdomain.com/api
  ```
- **Build cho iOS (macOS bắt buộc)**:
  ```bash
  flutter build ios --release --dart-define=API_BASE_URL=https://api.yourdomain.com/api
  ```

### 3. Lệnh Tiện Ích Phát Triển

- **Hot Reload**: Nhấn `r` trong terminal đang chạy `flutter run` để tải lại code mà không mất trạng thái ứng dụng.
- **Hot Restart**: Nhấn `R` để khởi động lại toàn bộ ứng dụng, xóa trạng thái hiện tại.
- **Phân tích lỗi tĩnh (Linting)**:
  ```bash
  flutter analyze
  ```
- **Chạy Unit Tests**:
  ```bash
  flutter test
  ```
- **Xóa cache & build cũ**:
  ```bash
  flutter clean
  flutter pub get
  ```

---

## 📱 Kiến Trúc & Tính Năng Chi Tiết Của Mobile App (Flutter)

### Kiến Trúc Tổng Quan

Ứng dụng di động được xây dựng theo kiến trúc **Screen-Service**, trong đó:

- **Screens** (`lib/screens/`): Các màn hình UI của ứng dụng, kết hợp `StatefulWidget` và `setState` để quản lý trạng thái cục bộ.
- **Services** (`lib/services/`): Lớp truy xuất dữ liệu từ API, đóng gói toàn bộ logic gọi HTTP.
- **Models** (`lib/models/`): Các lớp Dart định nghĩa cấu trúc dữ liệu, hỗ trợ `fromJson` để parse dữ liệu API.
- **Utils** (`lib/utils/`): Các hàm tiện ích dùng chung (định dạng tiền tệ, xử lý URL ảnh, đa ngôn ngữ).
- **Config** (`lib/config/`): Cấu hình trung tâm (URL API, môi trường).

### Cấu Hình URL API Động

URL gốc của API được inject tại thời điểm build thông qua `--dart-define`, đảm bảo không cần thay đổi code khi chuyển giữa môi trường Development và Production:

```dart
// lib/config/api_config.dart
class ApiConfig {
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:8000/api', // Android Emulator default
  );
}
```

> **Lưu ý**: Địa chỉ `10.0.2.2` là IP đặc biệt của Android Emulator trỏ về `localhost` của máy host. Khi chạy trên thiết bị vật lý, cần thay bằng IP LAN thực tế của máy chạy backend.

---

### Màn Hình & Tính Năng Đầy Đủ

#### 🏠 Màn Hình Chính (Home Screen)

Màn hình chính được tổ chức theo dạng **cuộn dọc nhiều section** để tối ưu UX:

| Section                | Mô Tả                                                                                  |
| :--------------------- | :------------------------------------------------------------------------------------- |
| **Banner Slider**      | Hiển thị banner quảng cáo dạng carousel tự động cuộn, dữ liệu từ API `/banners`.       |
| **Tabbed Products**    | Tabs sản phẩm theo danh mục (Điện thoại, Laptop, Tai nghe...) với khả năng cuộn ngang. |
| **Flash Sale Section** | Khu vực Flash Sale với bộ đếm ngược thời gian thực (Timer countdown).                  |
| **Coupon Section**     | Hiển thị các mã giảm giá khả dụng với nút "Sao chép" một chạm.                         |
| **Why Us Section**     | Giới thiệu lý do chọn E-Tech Market (Cam kết dịch vụ).                                 |
| **Newsletter**         | Form đăng ký nhận bản tin email.                                                       |

#### 🛍️ Danh Sách & Chi Tiết Sản Phẩm

- **Danh sách sản phẩm** (`ProductsScreen`): Hỗ trợ bộ lọc theo danh mục, thương hiệu và khoảng giá. Phân trang dạng "Xem thêm" (Load More).
- **Chi tiết sản phẩm** (`ProductDetailScreen`):
  - **Gallery đa phương tiện**: Trình chiếu ảnh và video sản phẩm theo dạng PageView với thumbnail cuộn ngang.
  - **Chọn biến thể (Variant Picker)**: Chọn màu sắc và cấu hình với cập nhật giá real-time.
  - **Flash Sale tích hợp**: Hiển thị giá Flash Sale và bộ đếm ngược thời gian nếu sản phẩm đang trong chiến dịch.
  - **Thông số kỹ thuật**: Bảng thông số dạng accordion có thể thu gọn.
  - **Nội dung phong phú**: Render HTML & bài viết tin tức liên quan đến sản phẩm.
  - **Đánh giá & Xếp hạng**: Thống kê sao phân bổ, lọc theo mức sao hoặc "Đã mua hàng", form gửi đánh giá đa chiều (Hiệu năng, Pin, Camera).
  - **Hỏi & Đáp (Q&A)**: Đặt câu hỏi trực tiếp cho cửa hàng và xem phần trả lời từ Admin.
  - **Sản phẩm liên quan**: Gợi ý sản phẩm tương tự và danh sách sản phẩm đã xem gần đây.

#### 🔍 Tìm Kiếm (`SearchScreen`)

- Tìm kiếm sản phẩm theo từ khóa với gợi ý tức thì (Debounce).
- Hiển thị lịch sử tìm kiếm gần đây.

#### 🛒 Giỏ Hàng & Thanh Toán

- **Giỏ hàng** (`CartScreen`): Quản lý sản phẩm, cập nhật số lượng, xóa sản phẩm và hiển thị tổng tiền động.
- **Thanh toán** (`CheckoutScreen`):
  - Chọn địa chỉ giao hàng.
  - Áp mã giảm giá (Coupon).
  - Chọn phương thức thanh toán: **MoMo**, **VNPAY** hoặc **COD**.
  - Tóm tắt đơn hàng trước khi xác nhận.

#### 📦 Quản Lý Đơn Hàng (`OrderListScreen`, `OrderDetailScreen`)

- Danh sách tất cả đơn hàng với bộ lọc theo trạng thái (Đang xử lý, Đang giao, Đã hoàn thành...).
- Chi tiết đơn hàng với timeline trạng thái trực quan.
- Yêu cầu hoàn trả đơn hàng.

#### 💬 Thông Báo (`NotificationsScreen`)

- Xem danh sách thông báo hệ thống (đơn hàng mới, cập nhật trạng thái).
- Đánh dấu đã đọc từng thông báo hoặc tất cả cùng lúc.

#### ❤️ Danh Sách Yêu Thích (`WishlistScreen`)

- Thêm/Xóa sản phẩm vào Wishlist với đồng bộ real-time lên backend.
- Chuyển nhanh từ Wishlist sang trang chi tiết sản phẩm.

#### 👤 Tài Khoản & Cá Nhân (`AccountScreen`)

- Xem và chỉnh sửa thông tin hồ sơ cá nhân, bao gồm cả avatar.
- Đổi mật khẩu bảo mật tài khoản.
- Quản lý voucher / coupon đang sở hữu.
- Điều hướng nhanh tới lịch sử đơn hàng và Wishlist.

#### 📰 Blog & Tin Tức (`BlogScreen`, `BlogDetailScreen`)

- Danh sách bài viết công nghệ phân loại theo danh mục (màu sắc riêng biệt cho từng danh mục).
- Bộ lọc bài viết theo chuyên mục.
- Bài viết nổi bật (Hero Section) và danh sách bài viết xem nhiều nhất.
- Đọc bài viết chi tiết với nội dung HTML được render đầy đủ.

#### 🎬 Video (`VideoScreen`, `VideoDetailScreen`)

- Danh sách video đánh giá sản phẩm phân loại theo danh mục video riêng biệt.
- Phát video trực tiếp trong ứng dụng.

#### 🔧 Admin Console (Dành Cho Quản Trị Viên)

Khi đăng nhập bằng tài khoản **Admin**, menu điều hướng sẽ hiện thêm khu vực quản trị riêng:

| Màn Hình Admin                                         | Chức Năng                                                                                                                  |
| :----------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------- |
| **Admin Dashboard**                                    | Tổng quan doanh thu, số đơn hàng mới, người dùng mới theo ngày/tuần/tháng.                                                 |
| **Quản lý Đơn hàng** (`AdminOrderListScreen`)          | Xem và cập nhật trạng thái tất cả đơn hàng trong hệ thống.                                                                 |
| **Chi tiết Đơn hàng Admin** (`AdminOrderDetailScreen`) | Xử lý chi tiết đơn: cập nhật trạng thái, xử lý yêu cầu hoàn trả (duyệt/từ chối/đã hoàn tiền), xem chứng minh ảnh hoàn trả. |
| **Quản lý Sản phẩm** (`AdminProductListScreen`)        | Xem danh sách sản phẩm, kích hoạt/vô hiệu hóa sản phẩm.                                                                    |
| **Quản lý Kho hàng** (`AdminInventoryScreen`)          | Kiểm tra tồn kho, cập nhật số lượng theo từng biến thể sản phẩm.                                                           |

#### 🛡️ Màn Hình Bảo Trì (`MaintenanceScreen`)

Khi Admin kích hoạt chế độ bảo trì từ web, người dùng thường sẽ thấy màn hình thông báo hệ thống đang bảo trì. Tài khoản Admin vẫn truy cập được bình thường.

---

### Danh Sách Services (Lớp Truy Xuất API)

| Service                | Endpoint Tương Ứng                 | Mô Tả                                                                   |
| :--------------------- | :--------------------------------- | :---------------------------------------------------------------------- |
| `AuthService`          | `/api/auth/*`, `/api/me`           | Đăng nhập, đăng ký, lấy thông tin người dùng, đăng xuất, refresh token. |
| `ProductsService`      | `/api/products/*`                  | Lấy danh sách, chi tiết, tìm kiếm, sản phẩm liên quan.                  |
| `CartService`          | `/api/cart/*`                      | Thêm/xóa/cập nhật giỏ hàng.                                             |
| `CheckoutService`      | `/api/checkout`, `/api/payments/*` | Đặt hàng, tạo link thanh toán MoMo/VNPAY.                               |
| `OrderService`         | `/api/orders/*`                    | Lịch sử đơn hàng, chi tiết đơn, yêu cầu hoàn trả.                       |
| `ReviewsService`       | `/api/products/{id}/reviews`       | Gửi đánh giá sản phẩm đa chiều.                                         |
| `WishlistService`      | `/api/wishlist/*`                  | Toggle yêu thích sản phẩm.                                              |
| `CouponService`        | `/api/coupons/*`                   | Lấy danh sách coupon, áp mã giảm giá.                                   |
| `VoucherService`       | `/api/vouchers/*`                  | Quản lý voucher của người dùng.                                         |
| `BannerService`        | `/api/banners`                     | Lấy danh sách banner trang chủ.                                         |
| `BlogService`          | `/api/blog-posts/*`                | Lấy danh sách và chi tiết bài viết.                                     |
| `VideoService`         | `/api/videos/*`                    | Lấy danh sách và chi tiết video.                                        |
| `NotificationService`  | `/api/notifications/*`             | Lấy và đánh dấu đã đọc thông báo.                                       |
| `FlashSaleService`     | `/api/flash-sales/*`               | Lấy thông tin Flash Sale đang diễn ra.                                  |
| `StoreService`         | `/api/store/config`                | Lấy cấu hình cửa hàng (maintenance mode, thông tin liên hệ).            |
| `AdminOrdersService`   | `/api/admin/orders/*`              | Xử lý đơn hàng và hoàn trả cho Admin.                                   |
| `AdminProductsService` | `/api/admin/products/*`            | Quản lý sản phẩm cho Admin.                                             |

---

## 🐳 Cẩm Nang Lệnh Docker & Docker Compose

Lệnh được thực thi tại thư mục gốc của dự án (nơi có chứa tệp `docker-compose.yml`).

### 1. Khởi Chạy & Dừng Containers

- **Khởi chạy toàn bộ hệ thống ngầm**: Tự động tải ảnh ảo, tạo mạng nội bộ, kết nối các Container (Frontend, Backend, DB, Redis, Queue) và chạy ngầm.
  ```bash
  docker-compose up -d
  ```
- **Khởi dựng lại và chạy**: Bắt buộc Docker phải build lại các Dockerfile (Frontend/Backend) để cập nhật code mới hoàn toàn.
  ```bash
  docker-compose up -d --build
  ```
- **Dừng hệ thống**: Tắt và giải phóng tài nguyên của các container nhưng giữ nguyên dữ liệu trong ổ đĩa ảo (Volumes).
  ```bash
  docker-compose down
  ```
- **Dừng hệ thống và XÓA SẠCH dữ liệu**: Tắt container và hủy bỏ toàn bộ dữ liệu database, cache lưu trong volumes. Dùng khi muốn reset môi trường Docker hoàn toàn sạch sẽ từ đầu.
  ```bash
  docker-compose down -v
  ```

### 2. Xem Trạng Thế & Log Hệ Thống

- **Xem danh sách Container đang chạy**: Kiểm tra xem các cổng 8000, 5173, 5432 có hoạt động bình thường không.
  ```bash
  docker-compose ps
  ```
- **Xem log thời gian thực của toàn bộ hệ thống**:
  ```bash
  docker-compose logs -f
  ```
- **Xem log chi tiết của một dịch vụ cụ thể**:

  ```bash
  # Xem log của Container Database
  docker-compose logs -f db

  # Xem log của Backend Laravel
  docker-compose logs -f backend

  # Xem log của Queue Worker trong Docker
  docker-compose logs -f queue
  ```

### 3. Thực Thi Lệnh Bên Trong Docker Containers

Bạn không cần cài đặt PHP hay PostgreSQL trên máy vật lý, chỉ cần gọi Docker thực thi lệnh trực tiếp vào trong môi trường ảo hóa:

- **Chạy Migrations trong Docker**:
  ```bash
  docker-compose exec backend php artisan migrate
  ```
- **Dọn dẹp cache Laravel trong Docker**:
  ```bash
  docker-compose exec backend php artisan optimize:clear
  ```
- **Truy cập vào Terminal của container Backend**:
  ```bash
  docker-compose exec backend bash
  ```
- **Truy cập Terminal dòng lệnh của Database PostgreSQL**:
  ```bash
  docker-compose exec db psql -U postgres -d etech
  ```

---

## 💾 Hướng Dẫn Đồng Bộ Dữ Liệu PostgreSQL Độc Quyền (Dành Cho Windows)

Để giúp quá trình chuyển dịch dữ liệu giữa **Máy Vật Lý (Host Machine)** và **Môi Trường Ảo (Docker)** diễn ra nhanh chóng, dự án được trang bị sẵn 2 kịch bản tự động hóa tối ưu mã hóa UTF-8 tiếng Việt:

### 1. Trích xuất dữ liệu thực tế từ máy Host (`export_database.bat`)

- **Mục đích**: Xuất toàn bộ cấu trúc và dữ liệu từ Database PostgreSQL trên máy chủ vật lý của bạn ra một file sao lưu an toàn.
- **Cách dùng**: Nhấp đúp chuột vào file `export_database.bat` ở thư mục gốc của dự án.
- **Kết quả**: Hệ thống sẽ sinh ra tệp `database_real_data_backup.sql` nằm ngay tại thư mục gốc của dự án.

### 2. Đổ dữ liệu thực tế đã sao lưu vào Docker (`import_database.bat`)

- **Mục đích**: Nhập toàn bộ dữ liệu từ tệp `database_real_data_backup.sql` vào cơ sở dữ liệu `etech` đang chạy bên trong Container Docker.
- **Cách dùng**:
  1. Đảm bảo các Container Docker đang khởi chạy (`docker-compose up -d`).
  2. Nhấp đúp chuột vào file `import_database.bat` ở thư mục gốc của dự án.
- **Quy trình tự động hóa bên trong script**:
  1. Script tự động kiểm tra sự tồn tại của tệp sao lưu.
  2. Sao chép tệp `database_real_data_backup.sql` vào bên trong container cơ sở dữ liệu `db` của Docker.
  3. Thực hiện dọn dẹp (Drop) database `etech` cũ đang tồn tại trong Docker để tránh xung đột ràng buộc khóa ngoại.
  4. Tạo mới lại database trống `etech` với chuẩn bảng mã UTF-8.
  5. Thực thi import dữ liệu mẫu với bảng mã UTF-8 chuẩn xác, khắc phục triệt để lỗi hiển thị sai font chữ tiếng Việt.

---

## 🔑 Tài Khoản Kiểm Thử Hệ Thống (Test Accounts)

Dự án đã được tích hợp sẵn các tài khoản với dữ liệu mẫu (Seeder) để bạn có thể đăng nhập ngay sau khi cài đặt thành công và chạy lệnh `php artisan db:seed`.

### 1. Tài Khoản Quản Trị (Admin Console)
- **Email**: `admin@etech.com`
- **Mật khẩu**: `admin123`
- _Quyền hạn: Có toàn quyền quản lý sản phẩm, đơn hàng, người dùng, xem thống kê doanh thu và cấu hình hệ thống. Truy cập đường dẫn `/admin` trên Web._

### 2. Tài Khoản Quản Lý Cửa Hàng (Shop Manager)
- **Email**: `shop@etech.com`
- **Mật khẩu**: `shop123`
- _Quyền hạn: Quản lý và xử lý đơn hàng, cập nhật trạng thái kho hàng._

### 3. Tài Khoản Khách Hàng (Customer)
- **Khách hàng 1**: `test@example.com` / Mật khẩu: `password123` (Có sẵn 500 điểm tích lũy và địa chỉ mẫu)
- **Khách hàng 2**: `customer@etech.com` / Mật khẩu: `password123`
- _Quyền hạn: Truy cập ứng dụng phía người dùng (Client Web/Mobile) để đặt hàng và thanh toán._

---

## 💳 Tài Khoản Thử Nghiệm Thanh Toán Sandbox (Demo)

Bạn có thể sử dụng các thông tin thẻ mô phỏng dưới đây để thực hiện quy trình đặt hàng và thanh toán trên hệ thống:

### 📱 Cổng Thanh Toán MoMo (Ví Thử Nghiệm)

- **Số thẻ/Số tài khoản**: `9704 0000 0000 0018`
- **Ngày phát hành**: `03/07`
- **Tên chủ thẻ**: `NGUYEN VAN A`
- **Số điện thoại**: Sử dụng một số điện thoại bất kỳ (Ví dụ: `0901234567`)
- **Mã OTP**: Nhập chính xác chuỗi ký tự **`OTP`** tại màn hình nhập mã xác thực của MoMo Sandbox.

### 🏦 Cổng Thanh Toán VNPAY (Thẻ ATM Nội Địa)

- **Ngân hàng**: Chọn ngân hàng **`NCB`** trên giao diện cổng thanh toán VNPAY.
- **Số thẻ**: `9704198526191432198`
- **Tên chủ thẻ**: `NGUYEN VAN A`
- **Ngày phát hành**: `07/15`
- **Mã OTP**: `123456`

---

## 🛠️ Khắc Phục Lỗi Thường Gặp (Troubleshooting)

### 1. Lỗi Không Hiển Thị Hình Ảnh Sản Phẩm (Local Host)

- **Nguyên nhân**: Thư mục `public/storage` chưa liên kết chính xác tới `storage/app/public` hoặc đường dẫn Junction Link bị hỏng.
- **Khắc phục**:
  1. Truy cập vào thư mục `e-tech-market-backend/public/`.
  2. Tìm và xóa thư mục (hoặc shortcut link) mang tên `storage` (nếu có).
  3. Mở Command Prompt (CMD) với quyền **Administrator** (Run as Administrator).
  4. Di chuyển vào thư mục backend và chạy lại lệnh:
     ```bash
     php artisan storage:link
     ```

### 2. Lỗi Xung Đột Cổng Chạy Local (Port Conflicted)

- **Nguyên nhân**: Cổng `8000` (Backend) hoặc `5173` (Frontend) đã bị ứng dụng khác chiếm dụng.
- **Khắc phục**:
  - Đối với Backend, khởi động lại server với cổng khác:
    ```bash
    php artisan serve --port=8080
    ```
  - Đối với Frontend, khởi động lại server Vite với cổng khác:
    ```bash
    npm run dev -- --port 3000
    ```
  - Đối với Docker, bạn có thể chỉnh sửa ánh xạ cổng trong file `docker-compose.yml` tại nhánh cấu hình `ports`.

---

## 🔒 Quy Tắc Bảo Mật & Phát Triển

- **Bảo mật tài nguyên cấu hình**: Tuyệt đối không bao giờ được commit các tệp `.env` chứa mật khẩu cơ sở dữ liệu thực tế, các khóa ký điện tử của ví MoMo/VNPAY lên hệ thống Git công khai.
- **Kiểm thử trước khi bàn giao**: Luôn chạy kiểm thử backend `php artisan test` và biên dịch kiểm tra kiểu dữ liệu frontend `npx tsc -b` trước khi đẩy các bản cập nhật lên máy chủ Production để đảm bảo tính toàn vẹn của mã nguồn.

---

## 📜 Bản Quyền & Liên Hệ

- **Bản quyền (License):** Dự án được phân phối dưới giấy phép [MIT License](https://opensource.org/licenses/MIT). Bạn có thể tự do sao chép, chỉnh sửa và sử dụng cho mục đích cá nhân hoặc thương mại.
- **Tác giả:** Hoang
- **Mục đích:** Đồ án mã nguồn mở hỗ trợ học tập và tham khảo kiến trúc Microservices / Headless E-Commerce đa nền tảng.

⭐️ *Nếu bạn thấy dự án này hữu ích, đừng quên cho nó một 🌟 **Star** trên GitHub nhé!*
