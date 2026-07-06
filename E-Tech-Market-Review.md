# 📋 E-Tech Market — Senior Architecture & Code Review

**Ngày đánh giá:** 03/07/2026
**Phạm vi đã kiểm tra:** README, docker-compose, Dockerfile, 305+ route definitions (`api_v1.php`), middleware phân quyền (`EnsureAdmin`), `AuthController`, `TwoFactorController`, `PaymentsController` + `PaymentService` (VNPay/MoMo), `UploadsController`, `HtmlSanitizer`, cấu hình CORS/Sanctum, `.env.example` & `.env.production.example`, 92 file migration, `phpstan-output.txt`, cấu trúc frontend React 19 + TS, CI/CD workflow (đang disable).

**Chưa đọc hết:** toàn bộ 49 controller, các Service class còn lại (`OrderService`, `FlashSaleService`…), toàn bộ 21 file test backend, mã Flutter app, mã React chi tiết từng component. Với dự án ~46MB / 3 nền tảng, việc lấy mẫu có chủ đích ở các điểm rủi ro cao nhất (auth, payment, upload, RBAC, docker) được ưu tiên hơn đọc toàn bộ dòng lệnh. Những phần chưa đủ dữ liệu được ghi rõ là "cần thêm thông tin" thay vì suy đoán.

---

## 1. Tổng quan dự án

**Tóm tắt:** Hệ sinh thái thương mại điện tử "Headless Commerce" cho thiết bị công nghệ, gồm Backend Laravel 10 (PostgreSQL + Redis), Frontend React 19/TS/Vite, Mobile Flutter. Có Admin Console phân quyền, flash sale, coupon, membership/loyalty, thanh toán VNPay/MoMo/COD, blog, Q&A, video review, chatbot.

**Đối tượng người dùng:** Người mua thiết bị công nghệ tại VN; nhân sự vận hành shop (kho, xử lý đơn, biên tập).

**Ý tưởng có mới không:** Không mới về mô hình (là một e-commerce vertical điển hình), nhưng phạm vi tính năng (loyalty, flash sale, Q&A, blog, so sánh sản phẩm, 3 nền tảng đồng bộ) là **rất rộng** so với một dự án cá nhân/portfolio — vừa là điểm mạnh vừa là rủi ro (dàn trải).

**Điểm mạnh nhất tổng thể:** Tư duy bảo mật khá trưởng thành ở tầng auth/payment (xem mục 5) — vượt mặt bằng chung của các dự án cùng quy mô.

---

## 2. Phân tích kiến trúc

| Thành phần | Đánh giá |
|---|---|
| **Backend** | Laravel 10, chia rõ Controller (Admin/Client/Auth) → Service → Model. Có `Enums`, `Support`, `Observers`, `Policies`, `Jobs`. 🟢 Kiến trúc layered hợp lý, không phải "fat controller" thuần túy. |
| **Auth** | Sanctum (SPA + token), có 2FA (Google2FA). 🟢 Tốt hơn kỳ vọng. |
| **Authorization** | Middleware `EnsureAdmin` custom kết hợp Spatie Permission, map route-name → permission. 🟡 Thiết kế hợp lý nhưng có `catch (\Throwable) {}` nuốt lỗi âm thầm ở nhiều nhánh — may là fail-closed (trả 403) nên không phải lỗ hổng, nhưng khó debug khi bảng permission lỗi. |
| **Payment** | VNPay + MoMo qua `PaymentService`, có xác thực chữ ký HMAC. 🟢 |
| **File Storage** | Laravel Storage disk `public`, validate mime + size ở upload đơn giản. Cần xem thêm cách `ProductsController` xử lý ảnh sản phẩm (chưa đọc). |
| **Cache/Queue** | Redis cho cache/session, Laravel Queue driver `database` (không phải Redis/SQS) cho gửi mail. 🟡 Chấp nhận được ở tải thấp, không tối ưu khi throughput tăng. |
| **Search** | Có tích hợp Meilisearch (Scout) trong docker-compose nhưng README/tính năng không nhắc — cần xác nhận đã dùng thực sự hay cấu hình dở dang. |
| **CI/CD** | Có file `.github/workflows/ci.yml.disabled` và `cd.yml.disabled` — **pipeline đã viết nhưng đang tắt**. 🟠 Không có kiểm tra tự động (test, lint, static analysis) trên mỗi PR. |
| **Coupling** | Domain lớn (order, payment, coupon, flash sale, loyalty) đều nằm trong 1 backend Laravel monolith. Ở quy mô hiện tại hợp lý — **không nên microservice hoá sớm**, sẽ là over-engineering. |

---

## 3. Review source code (mẫu quan sát)

### ✅ Điểm tốt
- Tách `Enums` (`OrderStatus`, `PaymentMethod`, `RoleSlug`) thay vì hardcode string rải rác.
- `AuthController::createTokenResponse()` xử lý khác nhau giữa production/dev (cookie httpOnly + `SameSite=None`+`Secure` ở production, token trong body ở dev) — thiết kế XSS-aware, hiếm gặp ở dự án tự học.

### ⚠️ Điểm cần lưu ý
- 🟠 **Route debug còn sót trong production code** (`routes/api_v1.php` dòng 58-65, 109-114): `/auth/test` và `/auth/test-token` không có middleware ẩn/gate môi trường, trả về email người dùng và 20 ký tự đầu của bearer token. Đây là **rò rỉ thông tin (info disclosure)**. **Cách khắc phục:** xoá hẳn hoặc bọc trong `if (!app()->isProduction())`.
- 🟡 `patch_tests.php`, `refactor_responses.php`, `convert.php` nằm ở root — trông giống script tiện ích one-off của dev, không nên commit vào repo chính thức.
- 🟡 PHPStan báo **15 lỗi** còn tồn đọng (`phpstan-output.txt`), gồm cả lỗi kiểu dữ liệu (`number_format` truyền string thay vì float) và truy cập property không tồn tại (`AdminSetting::$type`). Tín hiệu code chưa "sạch" theo static analysis.
- **Chưa đủ dữ liệu** để đánh giá SOLID/DRY/duplicate code toàn diện — cần review thêm các Service lớn (`OrderService`, `FlashSaleService`) chưa mở.

---

## 4. Database review

- 92 file migration, được thêm dần theo thời gian với nhiều migration "vá" (`add_indexes_to_performance_tables`, `add_gin_index_to_products_table`, `add_price_filter_index...`) — 🟢 team **có ý thức tối ưu index sau khi phát hiện chậm**, dấu hiệu tốt của dự án vận hành thực tế.
- Đếm được **55 lời gọi `index()`** trong migrations — mật độ index khá dày.
- Có GIN index cho PostgreSQL (full-text/array search trên bảng products) — đúng kỹ thuật cho Postgres.
- 🟡 Nhiều migration "sửa lại migration cũ" (VD: `remove_price_from_products_table` → `add_old_price_to_products_table` → `remove_old_price_from_products_and_variants`) cho thấy **schema đã đổi hướng nhiều lần** (giá chuyển từ product-level sang variant-level). Không sai về kỹ thuật, nhưng nên **squash migration** trước khi dự án lớn hơn.
- **Chưa đọc được:** N+1 query cụ thể trong Controller — chỉ xác nhận có nhiều `->get()` liên tiếp trong `HomeController`, cần kiểm tra có `->with()` eager-load đi kèm hay không.

---

## 5. Security review (Pentest sơ bộ)

| Hạng mục | Kết quả | Mức độ |
|---|---|---|
| Password hashing | `Hash::make`/`Hash::check` (bcrypt mặc định Laravel) ✅ | — |
| JWT/Token | Sanctum personal access token, có expiry, revoke token khi đổi mật khẩu ✅ | — |
| 2FA | Google2FA (TOTP) cho login ✅ | — |
| CSRF/Cookie | Cookie `sanctum_token` httpOnly, Secure theo môi trường, SameSite hợp lý ✅ | — |
| CORS | Không dùng wildcard `*` cho origin, có fallback an toàn, regex chỉ khớp localhost ✅ | — |
| Rate limiting | Có throttle riêng cho login/register/forgot-password/2FA/coupon-apply/chatbot ✅ | — |
| Payment signature (VNPay) | Dùng `hash_hmac(...) === $secureHash` thay vì `hash_equals()`. MoMo đã dùng đúng `hash_equals()`. | 🟡 Medium |
| **XSS lưu trữ (Stored XSS)** | `HtmlSanitizer` là sanitizer viết tay bằng regex để lọc HTML do Admin/Editor nhập (blog, product news). Regex-based sanitization luôn có nguy cơ bị bypass. Comment ghi "Admin users are trusted" nhưng có role **Editor** không toàn quyền — nếu tài khoản Editor bị chiếm quyền, nội dung độc hại có thể chạy trên trình duyệt của mọi khách hàng. | 🟠 High |
| Debug info leak | 2 route `/auth/test*` public leak email + token prefix | 🟠 High |
| File upload | Giới hạn mime (`jpeg,png,jpg,webp`), max 4096KB, `Storage::store()` tự sinh tên file (tránh path traversal) ✅ | — |
| Secrets trong docker-compose | `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `MEILISEARCH_KEY` có **default hardcode** (`postgres`, `etech-redis-secret-123`, `etech-master-key-1234`) nếu thiếu biến môi trường. | 🟠 High |
| `LOG_LEVEL=debug` trong docker-compose | Rủi ro chỉ khi dùng nhầm file compose dev cho production. `.env.production.example` đã đúng (`APP_DEBUG=false`, `LOG_LEVEL=info`). | 🟡 Medium |
| SQL Injection | Các đoạn đã xem đều dùng Eloquent/Query Builder, không raw SQL nối chuỗi — chưa phát hiện injection. | — |
| Broken Access Control | Route "confirm-payment", "confirm-received" cho phép client tự xác nhận — cần đảm bảo có `$this->authorize('view', $order)` như đã thấy ở `PaymentsController`. Chưa xác nhận ở `OrdersController`. | 🟡 cần audit thêm |

---

## 6. Hiệu năng (Performance)

- Index dày đặc, có GIN index cho tìm kiếm Postgres — 🟢.
- Endpoint `/home` gộp nhiều API thành 1 call — 🟢 tối ưu chủ động.
- Redis cho cache/session — 🟢.
- Queue driver `database` thay vì Redis — 🟡 sẽ là bottleneck khi traffic tăng.
- **Chưa kiểm tra được:** N+1 query cụ thể, compression response, lazy loading ảnh frontend, cấu hình pagination — cần audit runtime để kết luận chính xác.

---

## 7. DevOps

- Docker Compose multi-service (frontend, backend, nginx, queue worker, db, redis, meilisearch) — kiến trúc hợp lý cho self-host.
- 🟠 **Không có healthcheck** thực sự (bị comment out), không có `restart` policy cho service — container crash sẽ không tự phục hồi.
- 🟠 **CI/CD viết xong nhưng bị tắt** (`.disabled`) — mọi commit lên `main` hiện không có kiểm tra tự động nào.
- Có script export/import database — có ý thức backup, cần xác nhận có backup tự động định kỳ hay chỉ manual.
- **Độ sẵn sàng production:** gần đủ nhưng chưa hoàn thiện — cần bật lại CI/CD, xoá route debug, thay hardcoded secrets, siết XSS sanitizer trước khi go-live thật.

---

## 8. UI/UX review

**Giới hạn:** Chưa render được giao diện thực tế (không có ảnh chụp màn hình hoặc app chạy được) — cần thêm ảnh/demo để đánh giá chính xác, không suy đoán phần này.

Quan sát gián tiếp:
- Dùng `DOMPurify` ở frontend (sanitize client-side trước khi render HTML) — 🟢 lớp phòng thủ XSS thứ 2 hợp lý, bổ trợ cho điểm yếu ở mục 5.
- Có `react-helmet-async` (SEO/meta), `recharts` (biểu đồ dashboard), Zustand (state nhẹ) — stack phù hợp e-commerce.
- README liệt kê đầy đủ tính năng (WYSIWYG dual editor, compare tray, flash sale countdown) nhưng chưa thể xác nhận chất lượng UX thực tế nếu không có demo.

---

## 9. Product review

**Tính năng có vẻ dư/rủi ro dàn trải:** Blog + Video review + Chatbot + Loyalty + Flash Sale + Compare + Q&A cùng lúc là quá nhiều cho một team nhỏ duy trì. Mỗi tính năng thêm là thêm bề mặt tấn công và nợ kỹ thuật.

**Tính năng còn thiếu (dựa trên README):**
- Không rõ có hoàn tiền tự động qua gateway hay chỉ xử lý thủ công qua admin (return-request flow).
- Không rõ có search suggestion/autocomplete tận dụng Meilisearch hay chỉ filter DB thường.

**MVP đã đủ chưa:** Thừa cho MVP. Một MVP thương mại chỉ cần catalog, giỏ hàng, thanh toán, đơn hàng, admin cơ bản. Loyalty/Blog/Video/Chatbot nên là giai đoạn 2.

**Roadmap đề xuất:**
- **Giai đoạn 1 (ngay):** đóng lỗ hổng bảo mật mục 5, bật lại CI/CD, viết thêm test cho luồng thanh toán & authorization.
- **Giai đoạn 2 (ngắn hạn):** audit toàn bộ Controller còn lại theo checklist authorization, load test luồng Flash Sale (rủi ro race condition khi nhiều người mua cùng lúc số lượng giới hạn — chưa xem `FlashSaleService`).
- **Giai đoạn 3 (trung hạn):** squash migration, chuyển queue sang Redis nếu traffic tăng, thêm monitoring/alerting thực (Sentry, Prometheus).

---

## 10. Business review

Phù hợp thị trường VN (VNPay, MoMo, COD, tiếng Việt trong message lỗi). Khả năng triển khai cho SME là khả thi, nhưng cần dọn các điểm 🟠 trước khi giao cho khách hàng thật xử lý tiền thật. Không đủ thông tin (giá thành, đối thủ cụ thể) để đánh giá lợi thế cạnh tranh — cần thêm dữ liệu thị trường.

---

## 11. Rủi ro tổng hợp

| Rủi ro | Mức độ |
|---|---|
| Route debug lộ token/email | 🟠 High |
| Sanitizer HTML tự viết bằng regex, có thể bypass | 🟠 High |
| Secret mặc định hardcode trong docker-compose | 🟠 High |
| CI/CD bị tắt — không có kiểm tra tự động | 🟠 High |
| Không có healthcheck/restart policy | 🟡 Medium |
| VNPay dùng `===` thay vì `hash_equals` | 🟡 Medium |
| PHPStan còn 15 lỗi | 🟡 Medium |
| Migration chồng chéo nhiều lần (chưa squash) | 🟢 Low |
| Queue driver `database` thay vì Redis | 🟢 Low (ở quy mô hiện tại) |

---

## 12. Đề xuất cải tiến (theo ưu tiên)

**Immediate (trước khi nhận traffic thật):**
1. Xoá 2 route debug `/auth/test*` — chi phí thấp, tác động cao.
2. Loại bỏ default secret hardcode trong `docker-compose.yml` — bắt buộc set qua `.env`, fail nếu thiếu.
3. Đổi `hash_hmac === $secureHash` thành `hash_equals()` ở VNPay.

**Short-term:**
4. Bật lại CI (`ci.yml`), chạy PHPUnit + PHPStan + ESLint trên mỗi PR.
5. Thay `HtmlSanitizer` tự viết bằng thư viện đã kiểm chứng (HTML Purifier) hoặc whitelist rõ ràng.
6. Audit authorization cho toàn bộ route client tự thao tác trên `Order` (`cancel`, `confirm-received`, `confirm-payment`, `return-request`).

**Mid-term:**
7. Thêm healthcheck + restart policy cho toàn bộ service Docker.
8. Squash migration khi schema đã ổn định.
9. Load-test luồng Flash Sale để kiểm tra race condition khi vượt tồn kho.

**Long-term:**
10. Cân nhắc chuyển queue sang Redis nếu traffic tăng; thêm APM/monitoring thực (Sentry/New Relic).

---

## 13. Chấm điểm (thang 10, dựa trên phần đã xem)

| Hạng mục | Điểm | Ghi chú |
|---|---|---|
| Kiến trúc | 7.5 | Layered rõ ràng, hợp lý với quy mô |
| Security (auth) | 8 | Trên trung bình rõ rệt |
| Security (input/XSS) | 5 | Sanitizer tự viết là điểm trừ lớn |
| Database/Index | 7.5 | Index tốt, migration chưa squash |
| DevOps | 5 | CI/CD tắt, thiếu healthcheck |
| Code Quality (mẫu xem) | 6.5 | Sạch nhưng còn lỗi PHPStan, còn debug code sót lại |
| Production Readiness | 5.5 | Gần đủ nhưng còn vài lỗ hổng cần vá trước khi go-live |

*(Không chấm UI/UX, Frontend chi tiết, Business, Testing coverage cụ thể vì chưa đủ dữ liệu quan sát trực tiếp — cần demo/screenshot và đọc thêm test suite để chấm công bằng.)*

---

## 14. Kết luận (góc nhìn CTO)

- **Có duyệt vào production ngay không?** Chưa — cần vá xong nhóm 🟠 High (route debug, sanitizer, secret hardcode, CI/CD) trước.
- **Cho khách hàng dùng?** Chưa nên nhận thanh toán thật cho đến khi các điểm bảo mật High được xử lý — hệ thống có tiền thật đi qua VNPay/MoMo.
- **Đầu tư tiếp?** Có — nền tảng kỹ thuật (đặc biệt tầng auth/payment) cho thấy team hiểu vấn đề bảo mật, đáng đầu tư hoàn thiện thay vì viết lại.
- **Refactor trước?** Chỉ cần refactor có mục tiêu (sanitizer, dọn CI/CD, gỡ debug code) — không cần viết lại toàn bộ.

### Executive Summary

**5 điểm mạnh lớn nhất:**
1. Thiết kế auth/cookie/2FA vượt mặt bằng chung.
2. RBAC middleware có cấu trúc rõ ràng, fail-closed.
3. Payment signature verification đúng hướng (HMAC).
4. Index database dày, có GIN index cho Postgres.
5. Stack frontend hiện đại, có DOMPurify + test framework sẵn.

**5 điểm yếu lớn nhất:**
1. Sanitizer HTML tự viết dễ bypass.
2. Route debug lộ thông tin còn sót trong code.
3. Secret mặc định hardcode trong docker-compose.
4. CI/CD viết xong nhưng bị tắt hoàn toàn.
5. Thiếu healthcheck/restart policy cho hạ tầng Docker.

**5 việc cần làm ngay:**
Xoá route debug → sửa default secrets → đổi sang `hash_equals` ở VNPay → bật lại CI → thay sanitizer HTML.

**Nhận định tổng thể:** Dự án có chiều sâu kỹ thuật thật sự, không phải code demo hời hợt — đặc biệt ở tầng auth và payment. Vấn đề chính không phải thiếu năng lực mà là một vài chi tiết vệ sinh code/vận hành (hygiene) chưa được dọn trước khi công bố, đúng kiểu dự án đang phát triển tích cực (thấy rõ qua các migration "vá" liên tục theo thời gian).

- **Mức độ sẵn sàng Production:** ~60%
- **Mức độ sẵn sàng Scale:** ~50% (kiến trúc monolith ổn ở quy mô vừa, nhưng queue/monitoring chưa đủ cho traffic lớn)
- **Mức độ sẵn sàng Thương mại hóa:** ~55% (cần vá xong nhóm bảo mật High trước khi xử lý tiền thật của khách hàng)

---

**Ghi chú về giới hạn đánh giá:** Báo cáo dựa trên việc đọc trực tiếp mã nguồn ở các điểm rủi ro cao nhất (auth, payment, RBAC, docker, sanitizer) trong một monorepo rất lớn (46MB, 3 nền tảng). Để có kết luận đầy đủ 100%, cần thêm: toàn bộ Service layer (đặc biệt `OrderService`, `FlashSaleService`), test suite chi tiết, ảnh chụp/demo giao diện thực tế, và log runtime để xác nhận N+1 query cụ thể.
