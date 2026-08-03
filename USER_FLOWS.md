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
    Thu Cũ Đổi Mới
      Gửi Yêu Cầu Định Giá Thiết Bị
        Mô tả máy & Chọn Tình Trạng Thiết Bị
        Đính kèm Ảnh chụp thực tế
      Lịch Sử Yêu Cầu (Trang Profile)
        Xem chi tiết từng yêu cầu
        Xác nhận mức giá khi Admin báo giá
        Mang máy ra cửa hàng kiểm tra thực tế
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
    Quản Lý Thu Cũ Đổi Mới
      Danh Sách Yêu Cầu Thu Mua
      Xem Chi Tiết & Kiểm Tra Ảnh
      Duyệt & Báo Giá (Gửi Email khách)
      Chỉnh Sửa Báo Giá
      Hoàn Tất Thu Mua (Khách đã đồng ý)
      Từ Chối Thu Mua
      Quản Lý Tiêu Chí Đánh Giá (Conditions)
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

### 2.6. Luồng Thu Cũ Đổi Mới (Trade-In State Machine)

*Ghi chú: Đây là luồng hai chiều — Khách hàng khởi tạo yêu cầu & có thể xác nhận giá; Admin định giá và quyết định cuối cùng.*

```mermaid
stateDiagram-v2
    [*] --> pending: Khách gửi Yêu cầu định giá

    pending --> quoted: Admin Duyệt & Báo giá\n(Gửi Email thông báo khách)
    pending --> rejected: Admin Từ chối

    quoted --> quoted: Admin Chỉnh sửa báo giá

    %% Hành động của khách hàng
    quoted --> approved: Khách Xác nhận mức giá\n(Qua trang Profile - Lịch sử Thu cũ)

    %% Hành động của Admin sau khi khách đồng ý
    approved --> completed: Admin Hoàn tất thu mua\n(Sau khi kiểm tra máy tại cửa hàng)
    approved --> rejected: Admin Từ chối (Không khớp thực tế)

    rejected --> [*]
    completed --> [*]
```

#### Chi tiết các trạng thái:

| Trạng thái | Hiển thị | Người tác động | Mô tả |
|---|---|---|---|
| `pending` | Mới tiếp nhận | Hệ thống | Yêu cầu vừa được gửi, chờ Admin xử lý |
| `quoted` | Đã báo giá | Admin | Admin đã định giá dự kiến và gửi email cho khách |
| `approved` | Khách đồng ý | Khách hàng | Khách bấm "Xác nhận mức giá" trong Profile |
| `completed` | Đã thu mua | Admin | Đã kiểm tra máy tại cửa hàng & hoàn tất giao dịch |
| `rejected` | Từ chối | Admin | Admin từ chối ở bất kỳ bước nào |

### 2.7. Luồng Trang Cá Nhân (Profile Navigation Flow)

```mermaid
flowchart TD
    Login([Kách đăng nhập]) --> Profile["/profile"]

    Profile --> InfoTab[Thông tin cá nhân]
    Profile --> Orders["/profile/orders"]
    Profile --> Security["/profile/security"]
    Profile --> Coupons["/profile/coupons"]
    Profile --> Loyalty["/profile/loyalty"]
    Profile --> TradeIn["/profile/trade-in"]

    Orders --> OrderDetail["/profile/orders/:id"]
    OrderDetail --> ConfirmReceived[Xác nhận nhận hàng]
    OrderDetail --> RequestReturn[Yêu cầu hoàn trả]

    TradeIn --> TradeInList[Danh sách yêu cầu Thu cũ]
    TradeInList --> TradeInDetail[Xem chi tiết yêu cầu]
    TradeInDetail --> AcceptQuote{Trạng thái = quoted?}
    AcceptQuote -->|Có| ConfirmPrice[Xác nhận mức giá dự kiến]
    AcceptQuote -->|Không| ReadOnly[Đọc tóm tắt trạng thái]
    ConfirmPrice -->|approved| WaitShop[Hướng dẫn mang máy ra cửa hàng]

    TradeIn --> NewRequest["/trade-in - Gửi yêu cầu mới"]
```
