# KẾ HOẠCH TRIỂN KHAI HỆ THỐNG KHÁCH HÀNG THÂN THIẾT & TÍCH ĐIỂM E-TECH MARKET

* **Mã tài liệu:** PL-ETM-LOYALTY-2026[cite: 1, 3]
* **Phiên bản:** v1.0 (Chính thức)[cite: 1, 3]
* **Ngày lập:** 29/06/2026[cite: 1, 3]
* **Phạm vi áp dụng:** Bộ phận Product, Kỹ thuật (R&D) & Marketing[cite: 1, 3]
* **Trạng thái:** Bảo mật nội bộ[cite: 1, 3]

---

## Ⅰ. TỔNG QUAN DỰ ÁN (PROJECT OVERVIEW)

### 1. Bối cảnh chiến lược
E-Tech Market là nền tảng thương mại điện tử chuyên doanh các sản phẩm công nghệ, điện tử, thiết bị số[cite: 1, 3]. Đặc thù của ngành hàng này là chi phí tìm kiếm và chuyển đổi khách hàng mới (CAC - Customer Acquisition Cost) ngày càng đắt đỏ do cạnh tranh khốc liệt[cite: 1, 3]. Đồng thời, chu kỳ mua sắm các sản phẩm giá trị lớn (Laptop, Điện thoại, PC) thường kéo dài từ 1 đến 3 năm[cite: 1, 3]. 

Để tối ưu hóa Giá trị vòng đời khách hàng (LTV - Lifetime Value), việc xây dựng hệ sinh thái thúc đẩy tiêu dùng phụ kiện và gắn kết khách hàng cũ với thương hiệu thông qua giải pháp tích điểm thưởng là một bước đi sống còn[cite: 1, 3].

### 2. Mục tiêu dự án
* **Về mặt kinh doanh:** Tăng tỷ lệ khách hàng cũ quay lại mua hàng (Retention Rate) thêm 15% - 20% sau 6 tháng đầu tiên vận hành; thúc đẩy Giá trị đơn hàng trung bình (AOV) tăng ít nhất 10%[cite: 1, 3].
* **Về mặt hệ thống:** Xây dựng mô-đun tích - tiêu điểm tự động, bảo mật và đồng bộ hóa thời gian thực (Real-time); triển khai trực quan hóa hệ thống phân hạng thành viên trên mọi giao diện người dùng (App/Web)[cite: 1, 3].

---

## Ⅱ. CƠ CHẾ NGHIỆP VỤ VÀ LUẬT CHƠI (LOYALTY RULES)

Nhằm đảm bảo an toàn cho biên lợi nhuận của các sản phẩm công nghệ (vốn mỏng hơn hàng thời trang hay mỹ phẩm), cơ chế loyalty được thiết lập chặt chẽ như sau[cite: 1, 3]:

### 1. Quy tắc Tích & Tiêu điểm cơ bản
* **Tỷ lệ tích điểm tiêu chuẩn:** Cứ mỗi **100.000 VNĐ** giá trị đơn hàng thực chi sẽ tích lũy được **1 Point** (tương ứng tỷ lệ hoàn tiền cashback 1%)[cite: 1, 3].
* **Giá trị quy đổi khi sử dụng:** **1 Point = 1.000 VNĐ** khi trừ vào hóa đơn thanh toán tiếp theo[cite: 1, 3].
* **Điều kiện ghi nhận:** Điểm chỉ được cộng chính thức vào ví của khách hàng sau khi đơn hàng chuyển sang trạng thái **"Hoàn thành"** (Đã giao thành công và hoàn tất thời gian khiếu nại/đổi trả 7 ngày)[cite: 1, 3].
* **Thời hạn hiệu lực của điểm:** Điểm tích lũy sẽ tự động hết hạn và reset về 0 vào ngày **31/12** hàng năm nhằm kích thích hành vi "tiêu điểm dứt điểm" cuối năm[cite: 1, 3].

### 2. Hệ thống Phân hạng Thành viên (Membership Tiers)
Hệ thống tự động xét hạng dựa trên tổng chi tiêu tích lũy (`total_spent`) của người dùng trong vòng 365 ngày gần nhất[cite: 1, 3]:

| Hạng Thành Viên | Điều Kiện Tích Lũy | Hệ Số Điểm Tích | Đặc Quyền Cụ Thể |
| :--- | :--- | :--- | :--- |
| **Đồng (Bronze)** | Mới đăng ký tài khoản[cite: 1, 3] | x1.0 (Tích 1%)[cite: 1, 3] | Hưởng các chương trình khuyến mãi cơ bản và các đợt Flash Sale chung toàn sàn[cite: 1, 3]. |
| **Bạc (Silver)** | Chi tiêu > 10.000.000đ[cite: 1, 3] | x1.2 (Tích 1.2%)[cite: 1, 3] | Tặng Voucher trị giá 50.000đ vào tháng sinh nhật khách hàng[cite: 1, 3]. Chiết khấu thêm 2% khi mua phụ kiện[cite: 1, 3]. |
| **Vàng (Gold)** | Chi tiêu > 30.000.000đ[cite: 1, 3] | x1.5 (Tích 1.5%)[cite: 1, 3] | Tặng Voucher trị giá 100.000đ vào tháng sinh nhật[cite: 1, 3]; Miễn phí dịch vụ bảo dưỡng, vệ sinh laptop/PC định kỳ tại cửa hàng[cite: 1, 3]. |
| **Kim Cương (Diamond)** | Chi tiêu > 80.000.000đ[cite: 1, 3] | x2.0 (Tích 2%)[cite: 1, 3] | Ưu tiên xử lý bảo hành[cite: 1, 3]; Thời gian đổi trả mở rộng lên 30 ngày[cite: 1, 3]; Độc quyền đặt hàng trước các siêu phẩm công nghệ giới hạn (iPhone mới, GPU hiếm)[cite: 1, 2]. |

### 3. Danh mục sản phẩm loại trừ
> ⚠️ **Lưu ý nghiệp vụ:** Không áp dụng tích và tiêu điểm đối với các sản phẩm đang thuộc danh mục "Xả kho cắt lỗ", "Flash Sale giá sốc >30%" hoặc các sản phẩm độc quyền có biên lợi nhuận mỏng dưới 3% (Ví dụ: Các dòng máy chính hãng Apple trong vòng 3 tháng đầu ra mắt)[cite: 1, 3].

---

## Ⅲ. THIẾT KẾ KỸ THUẬT & KIẾN TRÚC DỮ LIỆU

### 1. Mô hình Cơ sở dữ liệu mở rộng (SQL Schema)

```sql
-- 1. Cập nhật thông tin loyalty vào bảng Users hiện tại
ALTER TABLE Users ADD COLUMN current_points INT DEFAULT 0;
ALTER TABLE Users ADD COLUMN total_spent DECIMAL(15,2) DEFAULT 0.00;
ALTER TABLE Users ADD COLUMN rank_id INT DEFAULT 1;

-- 2. Bảng cấu hình danh mục hạng thành viên
CREATE TABLE Membership_Ranks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    rank_name VARCHAR(50) NOT NULL,
    min_spend DECIMAL(15,2) NOT NULL,
    point_multiplier FLOAT DEFAULT 1.0,
    benefits TEXT
);

-- 3. Bảng lưu vết lịch sử biến động điểm (Bắt buộc để đối soát tài chính)
CREATE TABLE Point_History (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    order_id INT NULL,
    points_changed INT NOT NULL, -- Giá trị âm (-) nếu tiêu, dương (+) nếu tích
    action_type ENUM('EARN', 'SPEND', 'REFUND', 'EXPIRED', 'BONUS') NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id)
);
```[cite: 1, 3]

### 2. Các Logic Backend & APIs Core
* **Hàm `Calculate_Points_Earn(Order)`:** Kích hoạt khi đơn hàng chuyển sang `COMPLETED`[cite: 1, 3]. Hệ thống lấy tổng giá trị thực thanh toán (sau voucher, trước phí vận chuyển) chia cho 100.000đ, sau đó nhân với hệ số `point_multiplier` của người dùng[cite: 1, 3]. Ghi nhận giao dịch và cập nhật trường `current_points`[cite: 1, 3].
* **Hàm `Apply_Points_Checkout(User, Points_To_Use)`:** Kiểm tra tính hợp lệ của số điểm yêu cầu[cite: 1, 3]. Thực hiện quy đổi ra số tiền giảm giá trực tiếp[cite: 1, 3]. Áp dụng điều kiện ràng buộc: *Số tiền quy đổi không vượt quá 20% tổng giá trị đơn hàng hiện tại* để bảo toàn dòng tiền hệ thống[cite: 1, 3].
* **Hàm `Cron_Job_Daily_Update()`:** Chạy ngầm tự động lúc 00:00 mỗi ngày để quét lại lịch sử chi tiêu, tự động tính nâng/hạ hạng (`rank_id`) dựa trên tổng tiền chi tiêu thực tế trong năm qua của toàn bộ cơ sở dữ liệu khách hàng[cite: 1, 3].

---

## Ⅳ. THIẾT KẾ TRẢI NGHIỆM NGƯỜI DÙNG (UI/UX)

Hệ thống yêu cầu cập nhật giao diện đồng bộ tại 3 màn hình trọng yếu nhằm tác động mạnh nhất vào tâm lý mua sắm[cite: 1, 3]:

1.  **Màn hình Chi tiết Sản phẩm (Product Detail):** Bổ sung một badge (khung thông tin) nổi bật đặt ngay phía dưới phần hiển thị giá bán[cite: 1, 3]:
    * *💡 Đặc quyền Hội viên: Mua ngay sản phẩm này và tích lũy thêm +XX điểm (tương đương tiết kiệm XX.000đ cho các đơn sắm sửa phụ kiện lần sau)[cite: 1, 3].*
2.  **Giao diện trang Giỏ hàng & Thanh toán (Checkout Page):** Tích hợp khối chức năng "Ưu đãi thành viên": Hiển thị rõ ràng số điểm hiện tại khách có, giá trị quy đổi sang tiền mặt[cite: 1, 3]. Cung cấp một ô nhập số điểm cần dùng kèm nút lệnh "Áp dụng" hoặc thanh trượt kéo nhanh[cite: 1, 2]. Hệ thống tự cập nhật lại cột Tổng tiền (Total) theo thời gian thực (Real-time recalculation)[cite: 1, 3].
3.  **Màn hình Quản lý Tài khoản (User Dashboard):**
    * *Thẻ thành viên điện tử:* Hiển thị giao diện thẻ ảo có màu sắc sang trọng thay đổi theo phân hạng (Đồng: Nâu nhám, Bạc: Bạc ánh kim, Vàng: Vàng bóng, Kim Cương: Ánh ngũ sắc metallic)[cite: 1, 3].
    * *Thanh tiến trình (Progress Bar):* Trực quan hóa tiến độ thăng hạng (Ví dụ: "Bạn đã chi tiêu 12.000.000đ. Hãy mua thêm 8.000.000đ để thăng hạng Vàng hưởng thêm chiết khấu")[cite: 1, 3].
    * *Bảng tra cứu lịch sử:* Liệt kê tường tận dòng tiền điểm (Cộng màu xanh lá, Trừ màu đỏ) tăng độ tin cậy[cite: 1, 2].

---

## Ⅴ. LỘ TRÌNH TRIỂN KHAI CHI TIẾT (TIMELINE 4 TUẦN)

| Thời Gian | Hạng Mục Công Việc | Kết Quả Đầu Ra (Deliverables) |
| :--- | :--- | :--- |
| **Tuần 1** | - Khảo sát kỹ nghiệp vụ kinh doanh kế toán[cite: 1, 3].<br>- Thiết kế chi tiết UI/UX tất cả các màn hình (Figma)[cite: 1, 3].<br>- Duyệt tài liệu đặc tả nghiệp vụ (SRS)[cite: 1, 3]. | - Bộ thiết kế Figma hoàn chỉnh[cite: 1, 3].<br>- Tài liệu SRS được phê duyệt bởi PM[cite: 1, 3]. |
| **Tuần 2** | - Cấu trúc lại Database hệ thống[cite: 1, 3].<br>- Viết các API core tích điểm, áp dụng điểm và xử lý hoàn trả hàng[cite: 1, 3].<br>- Thiết lập các kịch bản chạy Cron Job quét hạng[cite: 1, 3]. | - Hệ thống cơ sở dữ liệu mới[cite: 1, 3].<br>- Hoàn thiện Postman bộ API Core Loyalty[cite: 1, 3]. |
| **Tuần 3** | - Đồng bộ API đổ dữ liệu lên giao diện User Dashboard[cite: 1, 3].<br>- Tích hợp logic xử lý giỏ hàng tại màn hình Checkout[cite: 1, 3].<br>- Xây dựng trang Admin Dashboard quản lý và điều chỉnh điểm thủ công[cite: 1, 3]. | - Giao diện Web Client hoàn thiện kết nối[cite: 1, 3].<br>- Trang quản trị Admin tích hợp phân hệ điểm[cite: 1, 3]. |
| **Tuần 4** | - Tiến hành kiểm thử toàn diện (UAT)[cite: 1, 3].<br>- Chạy thử nghiệm nội bộ (Staging test)[cite: 1, 3].<br>- Chạy script hồi tố dữ liệu khách hàng cũ để set hạng trước[cite: 1, 3].<br>- **Chính thức phát hành (Go-Live).**[cite: 1, 3] | - Hệ thống vận hành thực tế không lỗi[cite: 1, 3].<br>- Báo cáo kết quả Go-live dự án[cite: 1, 3]. |

---

## Ⅵ. CHIẾN LƯỢC GO-LIVE VÀ MARKETING KÍCH CẦU

1.  **Hồi tố tri ân:** Khi hệ thống vừa kích hoạt, gửi ngay email/thông báo chúc mừng khách hàng cũ đã tự động được thăng hạng và tặng một lượng điểm "mở bát" dựa vào đóng góp trước đây của họ nhằm tạo bất ngờ lớn[cite: 1, 3].
2.  **Chiến dịch "Tuần Lễ Vàng - Nhân 3 Điểm Thưởng":** Áp dụng chương trình nhân 3 lần điểm tích lũy cho toàn bộ danh mục **Phụ kiện công nghệ** trong tuần đầu ra mắt[cite: 1, 3]. Điều này vừa đẩy mạnh hàng tồn kho phụ kiện, vừa tạo làn sóng tích điểm lớn cho người dùng[cite: 1, 3].
3.  **Tặng điểm chào mừng:** Tặng ngay 20 điểm miễn phí (~20.000đ) cho mọi người dùng mới khi đăng ký tài khoản và hoàn thiện thông tin ngày sinh nhật, tạo thói quen theo dõi điểm cho khách hàng[cite: 1, 3].