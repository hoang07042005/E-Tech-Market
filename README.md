# 🛒 E-Tech Market — Hệ Thống Thương Mại Điện Tử Thiết Bị Công Nghệ Cao Cấp

**E-Tech Market** là một nền tảng thương mại điện tử chuyên biệt dành cho các thiết bị công nghệ và điện tử cao cấp. Dự án được thiết kế và phát triển theo mô hình **Full-Stack SPA hiện đại** với thiết kế giao diện (UI/UX) vô cùng bắt mắt, hiệu ứng mượt mà, hệ thống quản trị chuyên sâu và hàng loạt các giải pháp thanh toán điện tử tối ưu tại Việt Nam.

Dự án được phân chia thành hai thành phần cốt lõi:
*   **Backend API (Laravel 10)**: Nằm tại thư mục [`e-tech-market-backend`](file:///d:/E-Tech-Market/e-tech-market-backend), cung cấp hệ thống RESTful API an toàn, xử lý hàng đợi (queues) gửi thư và quản trị hệ thống.
*   **Frontend SPA (React, TypeScript & Vite)**: Nằm tại thư mục [`e-tech-market-frontend`](file:///d:/E-Tech-Market/e-tech-market-frontend), mang lại trải nghiệm khách hàng mượt mà bằng việc tối ưu hóa hiệu năng render qua ngôn ngữ **Vanilla CSS Premium**.

---

## 💎 Các Tính Năng Nổi Bật & Giải Pháp Kỹ Thuật

### 🌐 Trải Nghiệm Khách Hàng (Client SPA)
*   **Trang chủ ấn tượng**: Banner chuyển động mượt mà, danh mục sản phẩm trực quan, danh sách sản phẩm nổi bật cùng khu vực **Flash Sale** đếm ngược thời gian thực.
*   **Bộ lọc sản phẩm thông minh**: Lọc sản phẩm đa chiều theo giá, danh mục, thương hiệu, đánh giá và trạng thái kho hàng kèm phân trang động.
*   **Trang chi tiết sản phẩm tối ưu**:
    *   Thư viện ảnh sản phẩm zoom/slider chất lượng cao, tích hợp cả video đánh giá.
    *   Thông số kỹ thuật chi tiết theo dạng bảng chuyên nghiệp (hỗ trợ hiển thị thông số chung hoặc thông số riêng cho từng biến thể sản phẩm).
    *   **Bộ soạn thảo Nội dung Chi tiết Đa năng (WYSIWYG Dual Editor)**: Tự động nhận diện chuỗi dữ liệu. Nếu chứa mã HTML thì render thành định dạng đa phương tiện (HTML); nếu là văn bản viết tay thông thường thì tự động áp dụng `white-space: pre-wrap` để giữ nguyên các khoảng cách thụt lề, khoảng trắng và các dòng xuống dòng (`\n`).
    *   Hệ thống đánh giá sản phẩm trực quan (hiển thị biểu đồ phân bố sao, bộ lọc đánh giá kèm hình ảnh thực tế).
    *   Mục **Hỏi & Đáp (Shop Q&A)** giúp khách hàng tương tác trực tiếp với cửa hàng.
*   **Công cụ so sánh sản phẩm (Compare System)**: Cho phép chọn tối đa 3 sản phẩm cùng lúc để so sánh thông số chi tiết thông qua một thanh khay chứa tiện lợi (Compare Tray).
*   **Giỏ hàng & Thanh toán tối ưu**: Tích hợp các phương thức thanh toán phổ biến như **MoMo**, **VNPAY** và **COD** (Thanh toán khi nhận hàng).
*   **Trang cá nhân toàn diện**:
    *   Quản lý đơn hàng (theo dõi trạng thái chi tiết của từng đơn).
    *   Ví Voucher / Coupon (quản lý mã giảm giá khả dụng).
    *   Bảo mật tài khoản (đổi mật khẩu nâng cao).
    *   Hệ thống thông báo đồng bộ thời gian thực.
*   **Hệ thống Video độc lập**: Tích hợp danh mục video độc lập (`video_categories`) giúp tách rời và quản lý nội dung video đánh giá công nghệ mà không bị xung đột với bộ lọc danh mục sản phẩm.

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

## ⚙️ Cẩm Nang Lệnh Dành Cho Backend (Laravel 10)

Thư mục làm việc: `e-tech-market-backend/`

### 1. Lệnh Cài Đặt Ban Đầu
*   **Cài đặt dependencies**: Cài đặt toàn bộ các thư viện PHP được định nghĩa trong `composer.json`.
    ```bash
    composer install
    ```
*   **Tạo file cấu hình môi trường**: Sao chép file cấu hình mẫu.
    ```bash
    cp .env.example .env
    ```
*   **Tạo khóa bảo mật ứng dụng**: Khởi tạo giá trị `APP_KEY` trong file `.env` dùng để mã hóa cookie, session.
    ```bash
    php artisan key:generate
    ```
*   **Tối ưu hóa Autoloader**: Tạo lại sơ đồ lớp để tăng tốc độ tải file.
    ```bash
    composer dump-autoload
    ```

### 2. Lệnh Quản Trị Cơ Sở Dữ Liệu (Migrations & Seeders)
*   **Chạy migration cơ bản**: Tạo các bảng mới phát sinh trong dự án.
    ```bash
    php artisan migrate
    ```
*   **Thu hồi migration gần nhất**: Hủy bỏ lô migration vừa chạy gần nhất.
    ```bash
    php artisan migrate:rollback
    ```
*   **Reset và chạy lại toàn bộ Database**: Xóa sạch toàn bộ bảng và chạy lại toàn bộ migrations từ đầu (⚠️ Cực kỳ cẩn thận vì sẽ xóa sạch dữ liệu).
    ```bash
    php artisan migrate:fresh
    ```
*   **Đổ dữ liệu mẫu (Seeder)**: Nạp các bản ghi mẫu từ tệp seed của hệ thống vào database.
    ```bash
    php artisan db:seed
    ```
*   **Reset database và đổ lại dữ liệu mẫu**:
    ```bash
    php artisan migrate:fresh --seed
    ```

### 3. Lệnh Quản Lý Bộ Nhớ Đệm & Cấu Hình (Caching & Optimization)
Khi chỉnh sửa file `.env` hoặc cập nhật code Route, bạn bắt buộc phải xóa/tạo lại cache để Laravel nhận diện chính xác:
*   **Xóa toàn bộ các loại cache**: Dọn sạch cache cấu hình, routes, views.
    ```bash
    php artisan optimize:clear
    ```
*   **Tạo cache cho cấu hình (Tăng hiệu năng)**: Gộp các file cấu hình và thông tin từ `.env` thành 1 file duy nhất để đọc nhanh hơn.
    ```bash
    php artisan config:cache
    ```
*   **Xóa cache cấu hình**:
    ```bash
    php artisan config:clear
    ```
*   **Tạo cache cho Routes**: Gộp toàn bộ sơ đồ định tuyến lại.
    ```bash
    php artisan route:cache
    ```
*   **Xóa cache routes**:
    ```bash
    php artisan route:clear
    ```

### 4. Lệnh Vận Hành Hệ Thống Hàng Đợi (Queue Worker)
Hàng đợi được dùng để gửi Email hóa đơn, Email xác nhận tài khoản bất đồng bộ để tránh làm chậm trải nghiệm của khách hàng:
*   **Khởi chạy Queue Worker (Local)**: Lắng nghe và thực thi các jobs trong hàng đợi database liên tục.
    ```bash
    php artisan queue:work
    ```
*   **Lắng nghe hàng đợi dạng live-reload**: Tự động tải lại code khi có sự thay đổi (tiện dụng trong lúc code).
    ```bash
    php artisan queue:listen
    ```
*   **Khởi động lại toàn bộ Workers**: Buộc các tiến trình queue đang chạy ngầm phải khởi động lại (dùng khi bạn vừa sửa code Job gửi email).
    ```bash
    php artisan queue:restart
    ```

### 5. Lệnh Phát Triển & Khởi Chạy
*   **Tạo liên kết thư mục hình ảnh (Symlink)**: Cực kỳ quan trọng để hiển thị hình ảnh sản phẩm được upload.
    ```bash
    php artisan storage:link
    ```
*   **Khởi chạy Web Server cục bộ**: Khởi chạy Laravel Development Server chạy ở cổng mặc định 8000.
    ```bash
    php artisan serve
    ```
    *Chạy server tại một cổng hoặc IP tùy chọn:*
    ```bash
    php artisan serve --host=0.0.0.0 --port=8080
    ```
*   **Tạo nhanh các file mã nguồn mẫu (Scaffolding)**:
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
*   **Cài đặt Node modules**: Cài đặt toàn bộ các thư viện được liệt kê trong `package.json`.
    ```bash
    npm install
    ```
*   **Khởi chạy Dev Server**: Khởi động trình biên dịch Vite siêu tốc độ với tính năng Hot Module Replacement (HMR).
    ```bash
    npm run dev
    ```
    *Khởi chạy server công khai trong mạng LAN nội bộ:*
    ```bash
    npm run dev -- --host
    ```

### 2. Lệnh Kiểm Tra Cú Pháp & Biên Dịch (Build Production)
*   **Kiểm tra cú pháp TypeScript**: Quét toàn bộ dự án để tìm lỗi kiểu dữ liệu (Types) mà không sinh ra file build.
    ```bash
    npx tsc --noEmit
    ```
*   **Biên dịch các packages/dependencies**:
    ```bash
    npx tsc -b
    ```
*   **Chạy Linter quét lỗi code style**:
    ```bash
    npm run lint
    ```
*   **Biên dịch đóng gói dự án**: Tối ưu hóa dung lượng code CSS/JS, nén và sinh ra thư mục chứa sản phẩm tĩnh `dist/` sẵn sàng triển khai thực tế.
    ```bash
    npm run build
    ```
*   **Chạy thử bản Build tĩnh**: Xem trước sản phẩm sau khi nén ngay dưới local máy tính tại cổng mặc định `4173`.
    ```bash
    npm run preview
    ```

---

## 🐳 Cẩm Nang Lệnh Docker & Docker Compose

Lệnh được thực thi tại thư mục gốc của dự án (nơi có chứa tệp `docker-compose.yml`).

### 1. Khởi Chạy & Dừng Containers
*   **Khởi chạy toàn bộ hệ thống ngầm**: Tự động tải ảnh ảo, tạo mạng nội bộ, kết nối các Container (Frontend, Backend, DB, Redis, Queue) và chạy ngầm.
    ```bash
    docker-compose up -d
    ```
*   **Khởi dựng lại và chạy**: Bắt buộc Docker phải build lại các Dockerfile (Frontend/Backend) để cập nhật code mới hoàn toàn.
    ```bash
    docker-compose up -d --build
    ```
*   **Dừng hệ thống**: Tắt và giải phóng tài nguyên của các container nhưng giữ nguyên dữ liệu trong ổ đĩa ảo (Volumes).
    ```bash
    docker-compose down
    ```
*   **Dừng hệ thống và XÓA SẠCH dữ liệu**: Tắt container và hủy bỏ toàn bộ dữ liệu database, cache lưu trong volumes. Dùng khi muốn reset môi trường Docker hoàn toàn sạch sẽ từ đầu.
    ```bash
    docker-compose down -v
    ```

### 2. Xem Trạng Thế & Log Hệ Thống
*   **Xem danh sách Container đang chạy**: Kiểm tra xem các cổng 8000, 5173, 5432 có hoạt động bình thường không.
    ```bash
    docker-compose ps
    ```
*   **Xem log thời gian thực của toàn bộ hệ thống**:
    ```bash
    docker-compose logs -f
    ```
*   **Xem log chi tiết của một dịch vụ cụ thể**:
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
*   **Chạy Migrations trong Docker**:
    ```bash
    docker-compose exec backend php artisan migrate
    ```
*   **Dọn dẹp cache Laravel trong Docker**:
    ```bash
    docker-compose exec backend php artisan optimize:clear
    ```
*   **Truy cập vào Terminal của container Backend**:
    ```bash
    docker-compose exec backend bash
    ```
*   **Truy cập Terminal dòng lệnh của Database PostgreSQL**:
    ```bash
    docker-compose exec db psql -U postgres -d etech
    ```

---

## 💾 Hướng Dẫn Đồng Bộ Dữ Liệu PostgreSQL Độc Quyền (Dành Cho Windows)

Để giúp quá trình chuyển dịch dữ liệu giữa **Máy Vật Lý (Host Machine)** và **Môi Trường Ảo (Docker)** diễn ra nhanh chóng, dự án được trang bị sẵn 2 kịch bản tự động hóa tối ưu mã hóa UTF-8 tiếng Việt:

### 1. Trích xuất dữ liệu thực tế từ máy Host (`export_database.bat`)
*   **Mục đích**: Xuất toàn bộ cấu trúc và dữ liệu từ Database PostgreSQL trên máy chủ vật lý của bạn ra một file sao lưu an toàn.
*   **Cách dùng**: Nhấp đúp chuột vào file `export_database.bat` ở thư mục gốc của dự án. 
*   **Kết quả**: Hệ thống sẽ sinh ra tệp `database_real_data_backup.sql` nằm ngay tại thư mục gốc của dự án.

### 2. Đổ dữ liệu thực tế đã sao lưu vào Docker (`import_database.bat`)
*   **Mục đích**: Nhập toàn bộ dữ liệu từ tệp `database_real_data_backup.sql` vào cơ sở dữ liệu `etech` đang chạy bên trong Container Docker.
*   **Cách dùng**:
    1. Đảm bảo các Container Docker đang khởi chạy (`docker-compose up -d`).
    2. Nhấp đúp chuột vào file `import_database.bat` ở thư mục gốc của dự án.
*   **Quy trình tự động hóa bên trong script**:
    1. Script tự động kiểm tra sự tồn tại của tệp sao lưu.
    2. Sao chép tệp `database_real_data_backup.sql` vào bên trong container cơ sở dữ liệu `db` của Docker.
    3. Thực hiện dọn dẹp (Drop) database `etech` cũ đang tồn tại trong Docker để tránh xung đột ràng buộc khóa ngoại.
    4. Tạo mới lại database trống `etech` với chuẩn bảng mã UTF-8.
    5. Thực thi import dữ liệu mẫu với bảng mã UTF-8 chuẩn xác, khắc phục triệt để lỗi hiển thị sai font chữ tiếng Việt.

---

## 💳 Tài Khoản Thử Nghiệm Thanh Toán Sandbox (Demo)

Bạn có thể sử dụng các thông tin thẻ mô phỏng dưới đây để thực hiện quy trình đặt hàng và thanh toán trên hệ thống:

### 📱 Cổng Thanh Toán MoMo (Ví Thử Nghiệm)
*   **Số thẻ/Số tài khoản**: `9704 0000 0000 0018`
*   **Ngày phát hành**: `03/07`
*   **Tên chủ thẻ**: `NGUYEN VAN A`
*   **Số điện thoại**: Sử dụng một số điện thoại bất kỳ (Ví dụ: `0901234567`)
*   **Mã OTP**: Nhập chính xác chuỗi ký tự **`OTP`** tại màn hình nhập mã xác thực của MoMo Sandbox.

### 🏦 Cổng Thanh Toán VNPAY (Thẻ ATM Nội Địa)
*   **Ngân hàng**: Chọn ngân hàng **`NCB`** trên giao diện cổng thanh toán VNPAY.
*   **Số thẻ**: `9704198526191432198`
*   **Tên chủ thẻ**: `NGUYEN VAN A`
*   **Ngày phát hành**: `07/15`
*   **Mã OTP**: `123456`

---

## 🛠️ Khắc Phục Lỗi Thường Gặp (Troubleshooting)

### 1. Lỗi Không Hiển Thị Hình Ảnh Sản Phẩm (Local Host)
*   **Nguyên nhân**: Thư mục `public/storage` chưa liên kết chính xác tới `storage/app/public` hoặc đường dẫn Junction Link bị hỏng.
*   **Khắc phục**:
    1. Truy cập vào thư mục `e-tech-market-backend/public/`.
    2. Tìm và xóa thư mục (hoặc shortcut link) mang tên `storage` (nếu có).
    3. Mở Command Prompt (CMD) với quyền **Administrator** (Run as Administrator).
    4. Di chuyển vào thư mục backend và chạy lại lệnh:
       ```bash
       php artisan storage:link
       ```

### 2. Lỗi Xung Đột Cổng Chạy Local (Port Conflicted)
*   **Nguyên nhân**: Cổng `8000` (Backend) hoặc `5173` (Frontend) đã bị ứng dụng khác chiếm dụng.
*   **Khắc phục**:
    *   Đối với Backend, khởi động lại server với cổng khác:
        ```bash
        php artisan serve --port=8080
        ```
    *   Đối với Frontend, khởi động lại server Vite với cổng khác:
        ```bash
        npm run dev -- --port 3000
        ```
    *   Đối với Docker, bạn có thể chỉnh sửa ánh xạ cổng trong file `docker-compose.yml` tại nhánh cấu hình `ports`.

---

## 🔒 Quy Tắc Bảo Mật & Phát Triển
*   **Bảo mật tài nguyên cấu hình**: Tuyệt đối không bao giờ được commit các tệp `.env` chứa mật khẩu cơ sở dữ liệu thực tế, các khóa ký điện tử của ví MoMo/VNPAY lên hệ thống Git công khai.
*   **Kiểm thử trước khi bàn giao**: Luôn chạy kiểm thử backend `php artisan test` và biên dịch kiểm tra kiểu dữ liệu frontend `npx tsc -b` trước khi đẩy các bản cập nhật lên máy chủ Production để đảm bảo tính toàn vẹn của mã nguồn.

---

*Chúc các lập trình viên có những trải nghiệm phát triển tuyệt vời cùng hệ thống E-Tech Market!* 🚀
