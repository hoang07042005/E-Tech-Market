# TODO - Admin Order Detail fixes (images + return requests)

- [ ] Step 1: Fix `_getResolvedProductImage` in `admin_order_detail_screen.dart` to read `item['product']['main_image_url']` (and fallback to other keys).
- [ ] Step 2: Add UI section “Yêu cầu hoàn trả” in `admin_order_detail_screen.dart`:
  - [ ] Render status chip (pending/approved/refunded/rejected)
  - [ ] Render content, media, refund_proof, admin_note
  - [ ] Add action buttons: approve/reject/mark refunded
- [ ] Step 3: Wire buttons to `AdminOrdersService.processOrderReturn()` with action strings matching web (`approve`, `reject`, `refunded`).
- [ ] Step 4: Hot reload / run flutter to verify.
