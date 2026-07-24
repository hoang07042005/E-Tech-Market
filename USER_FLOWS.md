# Phân Tích Lưu Trình Người Dùng (User Flows)

Tài liệu này mô tả chi tiết các luồng nghiệp vụ (user flows) trong hệ thống E-Tech Market, bao gồm Khách Hàng, Quản Trị Viên (Admin), và Nhân Viên Giao Hàng.

---

## 1. Sơ Đồ Tư Duy Tổng Quan (Mindmaps)

### 1.1. Sơ Đồ Khách Hàng
```mermaid
mindmap
  root((Khách Hàng))
    Khám Phá
      Trang Chủ & Đề xuất
      Tìm Kiếm & Bộ Lọc Nâng Cao
      Danh Mục Sản Phẩm
      Chương Trình Khuyến Mãi (Flash Sale, Banner)
      Bài Viết Cập Nhật (Tin Tức)
    Tương Tác Sản Phẩm
      Xem Chi Tiết & Thông Số Kỹ Thuật
      Chọn Biến Thể (Màu Sắc, Cấu Hình)
      Đánh Giá & Nhận Xét
      Thêm Vào Yêu Thích / Giỏ Hàng
    Giỏ Hàng & Thanh Toán
      Quản Lý Sản Phẩm Trong Giỏ
      Áp Dụng Mã Giảm Giá & Điểm Thưởng
      Thanh Toán Checkout
        Chọn Địa Chỉ (Tỉnh/Thành, Quận/Huyện, Xã/Phường)
        Phương Thức Vận Chuyển
        Phương Thức Thanh Toán (COD, MoMo, VNPAY)
    Tài Khoản & Cá Nhân
      Đăng Nhập / Đăng Ký (Local, Google)
      Quên Mật Khẩu
      Cập Nhật Thông Tin, Avatar, Mật Khẩu
      Quản Lý Thông Báo
    Quản Lý Đơn Hàng
      Theo Dõi Trạng Thái
      Yêu Cầu Hủy Đơn (Khi chưa xử lý)
      Xác Nhận Nhận Hàng (Hoàn thành)
      Yêu Cầu Hoàn Trả / Hoàn Tiền
```

### 1.2. Sơ Đồ Quản Trị Viên (Admin)
```mermaid
mindmap
  root((Quản Trị Viên))
    Dashboard & Thống Kê
      Doanh Thu (Biểu đồ, khoảng thời gian)
      Đơn Hàng & Trạng Thái
      Sản Phẩm & Tồn Kho
    Quản Lý Sản Phẩm
      Danh Mục
      Sản Phẩm & Biến Thể
      Tồn Kho & Lịch Sử Tồn Kho
      Đánh Giá Sản Phẩm
    Quản Lý Đơn Hàng & Hoàn Trả
      Duyệt & Xử Lý Đơn Hàng
      Gán Nhân Viên Giao Hàng
      Quản Lý Yêu Cầu Hoàn Trả (Duyệt/Từ Chối)
      Xử Lý Hoàn Tiền
    Quản Lý Khách Hàng & Phân Quyền
      Danh Sách Khách Hàng & Lịch Sử
      Quản Lý Vai Trò (Admin, Giao Hàng, Nhân Viên)
    Marketing & Cấu Hình
      Mã Giảm Giá (Coupon)
      Banner Quảng Cáo
      Bài Viết (Tin tức công nghệ)
      Cấu Hình Vận Chuyển (Shipping Methods)
```

### 1.3. Sơ Đồ Nhân Viên Giao Hàng
```mermaid
mindmap
  root((NV Giao Hàng))
    Đơn Hàng Được Giao
      Danh Sách Đơn Cần Giao
      Cập Nhật Trạng Thái (Đang giao, Đã giao)
    Lịch Sử Giao Hàng
      Thống Kê Đơn Thành Công
```

---

## 2. Lưu Trình Nghiệp Vụ Chi Tiết (Flowcharts)

### 2.1. Luồng Mua Hàng & Thanh Toán (Checkout Flow)
```mermaid
flowchart TD
    A["Khách hàng thêm SP vào giỏ"] --> B{"Giỏ hàng có SP?"}
    B -- Không --> C["Tiếp tục mua sắm"]
    B -- Có --> D["Chuyển đến trang Thanh toán"]
    D --> E["Nhập/Chọn Địa Chỉ Giao Hàng"]
    E --> F["Chọn Đơn Vị & Phương Thức Vận Chuyển"]
    F --> G["Áp dụng Mã Giảm Giá & Điểm Thưởng"]
    G --> H["Chọn Phương Thức Thanh Toán"]
    
    H --> I{"Thanh toán Online?"}
    I -- VNPAY / MoMo --> J["Chuyển hướng đến Cổng Thanh Toán"]
    J --> K{"Thanh toán thành công?"}
    K -- Thất bại / Hủy --> L["Đơn hàng trạng thái Pending, chờ thanh toán lại"]
    K -- Thành công --> M["Tạo Đơn Hàng: Trạng thái Paid/Processing"]
    
    I -- COD (Tiền mặt) --> M2["Tạo Đơn Hàng: Trạng thái Pending/Processing"]
    
    M --> N["Gửi Email Xác Nhận / Thông Báo"]
    M2 --> N
    N --> O(("Kết thúc luồng"))
```

### 2.2. Luồng Xử Lý Đơn Hàng (Order Processing Flow)
```mermaid
stateDiagram-v2
    [*] --> Pending: Khách đặt hàng (COD)
    [*] --> Paid: Khách thanh toán Online
    
    Pending --> Processing: Admin xác nhận
    Paid --> Processing: Admin xác nhận
    
    Pending --> Cancelled: Khách/Admin hủy
    Paid --> Cancelled: Admin hủy (Cần hoàn tiền thủ công)
    Processing --> Cancelled: Admin hủy
    
    Processing --> Shipped: Admin bàn giao cho ĐVVC / NV Giao hàng
    
    Shipped --> Delivered: Khách đã nhận hàng / NV xác nhận giao
    
    Delivered --> Completed: Khách xác nhận / Hết hạn đổi trả
    Delivered --> Return_Requested: Khách yêu cầu hoàn trả
    
    Return_Requested --> Returned: Admin duyệt & Hoàn tiền
    Return_Requested --> Completed: Admin từ chối hoàn trả
    
    Completed --> [*]
    Cancelled --> [*]
    Returned --> [*]
```

### 2.3. Luồng Hoàn Trả & Hoàn Tiền (Return & Refund Flow)
```mermaid
sequenceDiagram
    participant C as Khách Hàng
    participant S as Hệ Thống
    participant A as Quản Trị Viên

    C->>S: Gửi yêu cầu hoàn trả (Lý do, Hình ảnh minh chứng)
    S->>S: Chuyển trạng thái ĐH có Return Request (Pending)
    S->>A: Gửi thông báo có yêu cầu mới
    A->>S: Xem xét minh chứng
    
    alt Từ chối hoàn trả
        A->>S: Từ chối (Kèm lý do)
        S->>C: Thông báo từ chối
        S->>S: Đóng yêu cầu, Đơn hàng tiếp tục trạng thái cũ (hoặc Completed)
    else Chấp nhận hoàn trả
        A->>S: Phê duyệt (Kèm ghi chú)
        S->>C: Thông báo gửi hàng hoàn về kho
        C->>S: Cung cấp mã vận đơn hoàn trả (Tuỳ chọn)
        A->>S: Xác nhận nhận lại hàng & Thực hiện hoàn tiền
        S->>S: Trạng thái ĐH -> Returned, Cộng lại Tồn kho
        S->>C: Thông báo hoàn tiền thành công
    end
```

### 2.4. Luồng Giao Hàng Nội Bộ (Delivery Staff Flow)
```mermaid
flowchart TD
    A["Admin gán Đơn Hàng cho NV Giao Hàng"] --> B["NV Giao Hàng nhận thông báo"]
    B --> C["NV Giao Hàng đăng nhập, xem Danh Sách Đơn"]
    C --> D["Chuyển trạng thái: Đang Giao (Shipped)"]
    D --> E{"Giao thành công?"}
    E -- Thành Công --> F["NV chuyển trạng thái: Đã Giao (Delivered)"]
    E -- Thất Bại --> G["NV báo cáo Admin (Thêm ghi chú)"]
    G --> H["Admin xem xét, Hủy đơn hoặc dời ngày giao"]
```
