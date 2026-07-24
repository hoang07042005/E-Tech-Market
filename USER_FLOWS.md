# Phân Tích Lưu Trình Người Dùng (User Flows)

Tài liệu này mô tả chi tiết các luồng nghiệp vụ (user flows) trong hệ thống E-Tech Market, được phân tích chặt chẽ dựa trên code thực tế của dự án. Hệ thống quản lý Khách Hàng, Quản Trị Viên (Admin), và Nhân Viên Giao Hàng.

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
      Theo Dõi Trạng Thái Đơn
      Yêu Cầu Hủy Đơn (Chỉ khi Pending)
      Xác Nhận Đã Nhận Hàng (Chuyển sang Completed)
      Yêu Cầu Hoàn Trả (Kèm lý do & Ảnh minh chứng)
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
    Quản Lý Đơn Hàng
      Cập Nhật Trạng Thái (Processing, Paid, Shipped, Delivered)
      Gán Nhân Viên Giao Hàng
      Duyệt/Từ chối Yêu cầu Hoàn Trả (Approve / Reject)
      Xác nhận Hoàn tiền & Nhận lại kho (Mark Refunded)
    Quản Lý Khách Hàng & Phân Quyền
      Danh Sách Khách Hàng & Lịch Sử
      Quản Lý Vai Trò (Admin, Giao Hàng, Nhân Viên)
    Marketing & Cấu Hình
      Mã Giảm Giá (Coupon)
      Banner Quảng Cáo
      Bài Viết (Tin tức công nghệ)
      Cấu Hình Vận Chuyển (Shipping Methods)
```

---

## 2. Lưu Trình Nghiệp Vụ Chặt Chẽ (Strict Flowcharts & State Machines)

Dựa trên code API backend, đây là các quy trình thực tế mà hệ thống cho phép.

### 2.1. Luồng Thanh Toán (Payment State Machine)
```mermaid
stateDiagram-v2
    [*] --> Cart: Thêm SP vào giỏ
    Cart --> CheckoutForm: Nhấn Thanh toán
    
    CheckoutForm --> Processing_VNPAY_MoMo: Chọn TT Online
    Processing_VNPAY_MoMo --> pending_payment: Tạo Đơn ẩn
    pending_payment --> Payment_Gateway: Chuyển Cổng TT
    
    Payment_Gateway --> pending: TT thành công
    Payment_Gateway --> pending_payment: Hủy hoặc Lỗi
    
    CheckoutForm --> pending: Chọn COD
    
    pending --> [*]: Ghi nhận Đơn hàng
```

### 2.2. Vòng Đời & Trạng Thái Đơn Hàng (Order State Machine)
*(Ghi chú: Admin không thể chủ động chuyển đơn hàng sang trạng thái "Completed", "Cancelled" hay "Returned". Các trạng thái này bắt buộc phải đi qua hành động của Khách hàng hoặc luồng Hoàn trả).*

```mermaid
stateDiagram-v2
    [*] --> pending: Đặt hàng thành công
    
    pending --> processing: Admin Xác Nhận
    processing --> paid: Admin Báo Đang Chuẩn Bị
    paid --> shipped: Admin Báo Đang Giao
    
    %% Cập nhật nhảy cóc
    pending --> shipped: Admin Giao Ngay
    
    shipped --> delivered: Admin Báo Đã Giao
    
    %% Luồng Khách Hàng thao tác
    pending --> cancelled: Khách tự Hủy đơn
    delivered --> completed: Khách Xác nhận
    
    %% Luồng Hoàn Trả
    delivered --> ReturnRequest: Khách Yêu Cầu Hoàn Trả
    ReturnRequest --> returned: Admin Duyệt và Hoàn tiền
    ReturnRequest --> delivered: Admin Từ chối
    
    cancelled --> [*]
    completed --> [*]
    returned --> [*]
```

### 2.3. Luồng Hoàn Trả & Hoàn Tiền (Return & Refund State Machine)
```mermaid
stateDiagram-v2
    [*] --> pending: Khách tạo Yêu cầu
    
    pending --> rejected: Admin Từ Chối
    rejected --> [*]: Quay về Đã Giao
    
    pending --> approved: Admin Chấp Nhận
    approved --> waiting_for_goods: Khách trả hàng
    waiting_for_goods --> item_received: Kho nhận hàng
    
    item_received --> refunded: Admin bấm Hoàn Tiền
    refunded --> order_returned: Đơn Hàng thành Hoàn Trả
    order_returned --> inventory_restored: Hệ thống Cộng Tồn Kho
    
    inventory_restored --> [*]
```

### 2.4. Luồng Nhân Viên Giao Hàng Nội Bộ (Shipper State Machine)
```mermaid
stateDiagram-v2
    [*] --> Unassigned: Đơn hàng mới
    
    Unassigned --> Assigned_To_Shipper: Admin gán Shipper
    Assigned_To_Shipper --> Shipped: Bấm Đang Giao
    
    Shipped --> Delivered: Bấm Đã Giao
    
    Shipped --> Delivery_Failed: Giao thất bại
    Delivery_Failed --> Admin_Review: Báo lỗi lên Admin
    
    Admin_Review --> Cancelled: Admin Hủy đơn
    Admin_Review --> Shipped: Yêu cầu giao lại
    
    Delivered --> [*]: Chờ Khách Xác nhận
    Cancelled --> [*]: Kết thúc thất bại
```

### 2.5. Luồng Nghiệp Vụ Của Quản Trị Viên (Admin Operations)

Phần này đặc tả chặt chẽ các quy trình quản trị cốt lõi mà Admin thực hiện hàng ngày trên Dashboard.

#### A. Quản Lý Sản Phẩm & Tồn Kho (Product Management State Machine)
```mermaid
stateDiagram-v2
    [*] --> Draft: Tạo Sản phẩm mới
    
    Draft --> Configuring_Variants: Thêm Biến thể
    Configuring_Variants --> Pricing: Cài đặt Giá
    
    Pricing --> Stock_Entry: Nhập Tồn kho
    Stock_Entry --> Published: Bật Hiển thị
    
    Published --> Out_Of_Stock: Khách mua hết hàng
    Out_Of_Stock --> Stock_Entry: Admin nhập thêm hàng
    
    Published --> Hidden: Admin Ẩn SP
    Hidden --> Published: Admin Bật lại
    
    Published --> [*]: Xóa SP
```

#### B. Xử Lý Phân Phối Đơn Hàng (Order Fulfillment State Machine)
```mermaid
stateDiagram-v2
    [*] --> New_Order: Có Đơn mới
    
    New_Order --> Stock_Check: Kiểm tra Tồn kho
    
    Stock_Check --> Processing: Còn hàng
    Stock_Check --> Cancelled: Hết hàng
    
    Processing --> Packing: In vận đơn
    Packing --> Ready_To_Ship: Đóng gói xong
    
    Ready_To_Ship --> Handed_Over: Giao ĐVVC hoặc Shipper
    Handed_Over --> Shipped: Cập nhật Đang Giao
    
    Shipped --> [*]: Chờ phản hồi
    Cancelled --> [*]: Hoàn tất hủy
```
