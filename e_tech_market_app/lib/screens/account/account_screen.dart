import 'package:flutter/material.dart';
import '../../utils/network_utils.dart';
import '../../utils/translation.dart';
import 'clause/terms_screen.dart';
import '../orders/order_list_screen.dart';
import 'security/security_screen.dart';
import 'profile/profile_screen.dart';
import 'voucher_warehouse/voucher_warehouse_screen.dart';
import '../wishlist/wishlist_screen.dart';
import 'information/about_screen.dart';
import 'information/contact_screen.dart';
import 'setting/setting_screen.dart';
import '../admin/inventory/admin_inventory_screen.dart';
import '../admin/products/admin_product_screen.dart';
import '../admin/orders/admin_order_screen.dart';
import '../admin/dashboard/admin_dashboard_screen.dart';

class AccountScreen extends StatelessWidget {
  final Map<String, dynamic> user;
  final VoidCallback onLogout;

  const AccountScreen({
    super.key,
    required this.user,
    required this.onLogout,
  });


  String _getAvatarInitial() {
    final name = user['name'] as String?;
    if (name == null || name.isEmpty) return 'U';
    
    final parts = name.split(' ');
    if (parts.isEmpty) return 'U';
    
    final lastName = parts.last;
    if (lastName.isEmpty) return 'U';
    
    return lastName[0].toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    String? avatarUrl = user['avatar'] as String? ??
        user['avatar_url'] as String? ??
        user['profile_image'] as String? ??
        user['image'] as String?;
    
    if (avatarUrl != null && avatarUrl.isNotEmpty) {
      avatarUrl = NetworkUtils.fixDeviceUrl(avatarUrl);
    } else {
      avatarUrl = null;
    }

    final name = user['name'] ?? Trans.guestUser;
    final email = user['email'] ?? Trans.noEmail;

    // Kiểm tra xem người dùng có vai trò là admin không
    bool isAdmin = false;
    final roles = user['roles'];
    if (roles is List) {
      isAdmin = roles.any((role) => role is Map && role['slug'] == 'admin');
    }

    return SafeArea(
      
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // Profile Image
            Container(
              padding: const EdgeInsets.all(4),
              decoration: const BoxDecoration(
                color: Colors.white,
                shape: BoxShape.circle,
              ),
              child: Container(
                width: 100,
                height: 100,
                decoration: const BoxDecoration(
                  color: Color(0xFFEF7A45),
                  shape: BoxShape.circle,
                ),
                child: ClipOval(
                  child: avatarUrl != null && avatarUrl.isNotEmpty
                      ? Image.network(
                          avatarUrl,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) {
                            return Center(
                              child: Text(
                                _getAvatarInitial(),
                                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 36),
                              ),
                            );
                          },
                        )
                      : Center(
                          child: Text(
                            _getAvatarInitial(),
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 36),
                          ),
                        ),
                ),
              ),
            ),
            const SizedBox(height: 16),
            
            // Name and Email
            Text(
              name,
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface),
            ),
            const SizedBox(height: 4),
            Text(
              email,
              style: TextStyle(fontSize: 14, color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6)),
            ),
            
            const SizedBox(height: 32),

            // --- TÀI KHOẢN ---
            _buildMenuSection(
                context: context,
                title: Trans.accountTitle,
              
              children: [
                // Thông tin cá nhân: Màu Xanh Dương (Tin cậy)
                _buildMenuItem(
                  context,
                  Icons.person_outline,
                  Trans.personalInfo, 
                  const Color(0xFFE0F2FE), 
                  const Color(0xFF0284C7), 
                  () {
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const ProfileScreen()));
                  }
                ),
                // Đơn hàng: Màu Vàng Cam (Trạng thái giao nhận, vận chuyển)
                _buildMenuItem(
                  context,
                  Icons.receipt_long_outlined,
                  Trans.myOrders, 
                  const Color(0xFFFEF3C7), 
                  const Color(0xFFD97706), 
                  () {
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const OrderListScreen()));
                  }
                ),
                // Sản phẩm yêu thích: Màu Hồng/Đỏ (Yêu thích, tim)
                _buildMenuItem(
                  context,
                  Icons.favorite_outline,
                  Trans.myWishlist, 
                  const Color(0xFFFCE7F3), 
                  const Color(0xFFDB2777), 
                  () {
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const WishlistScreen()));
                  }
                ),
                // Kho voucher: Màu Tím (Ưu đãi, sự kiện đặc biệt)
                _buildMenuItem(
                  context,
                  Icons.local_activity_outlined,
                  Trans.voucherWarehouse, 
                  const Color(0xFFF3E8FF), 
                  const Color(0xFF9333EA), 
                  () {
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const VoucherWarehouseScreen()));
                  }
                ),
              ],
            ),
            
            const SizedBox(height: 24),

            // --- VỀ E-TECH MARKET ---
            _buildMenuSection(
                context: context,
                title: Trans.aboutEtech,
              children: [
                // Giới thiệu: Màu Lam Ngọc/Teal (Thông tin doanh nghiệp)
                _buildMenuItem(
                  context,
                  Icons.info_outline,
                  Trans.introduction,
                  const Color(0xFFE0F2F1),
                  const Color(0xFF00897B),
                  () {
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const AboutScreen()));
                  }
                ),
                // Liên hệ & Hỗ trợ: Màu Xanh Lá (Tổng đài, hỗ trợ trực tuyến năng động)
                _buildMenuItem(
                  context,
                  Icons.headset_mic_outlined,
                  Trans.contactSupport,
                  const Color(0xFFDCFCE7),
                  const Color(0xFF16A34A),
                  () {
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const ContactScreen()));
                  }
                ),
              ],
            ),
            
            const SizedBox(height: 24),
            
            // --- THIẾT LẬP ---
            _buildMenuSection(
                context: context,
                title: Trans.setup,
              children: [
                // Bảo mật: Màu Xanh Khiên/Xanh Chàm (An toàn, bảo mật)
                _buildMenuItem(
                  context,
                  Icons.security_outlined,
                  Trans.security,
                  const Color(0xFFE0E7FF),
                  const Color(0xFF4F46E5),
                  () {
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const SecurityScreen()));
                  }
                ),
                // Các điều khoản: Màu Cam Đất (Văn bản pháp lý, lưu ý)
                _buildMenuItem(
                  context,
                  Icons.article_outlined,
                  Trans.terms,
                  const Color(0xFFFFEDD5),
                  const Color(0xFFEA580C),
                  () {
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const TermsScreen()));
                  }
                ),
                // Cài đặt: Màu Xám Slate (Hệ thống, cấu hình)
                _buildMenuItem(
                  context,
                  Icons.settings_outlined,
                  Trans.setting,
                  const Color(0xFFF1F5F9),
                  const Color(0xFF64748B),
                  () {
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const SettingScreen()));
                  }
                ),
              ],
            ),

            const SizedBox(height: 24),
            
            // --- QUẢN TRỊ (ADMIN) ---
            if (isAdmin) ...[
              _buildMenuSection(
                context: context,
                title: Trans.adminPanel,
                children: [
                  // Tổng quan (Dashboard): Màu Tím/Indigo
                  _buildMenuItem(
                  context,
                    Icons.dashboard_outlined,
                    Trans.systemOverview,
                    const Color(0xFFE0E7FF),
                    const Color(0xFF4338CA),
                    () {
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const AdminDashboardScreen()));
                    }
                  ),
                  // Tồn kho: Màu Nâu/Hổ phách (Kho bãi, lưu trữ)
                  _buildMenuItem(
                  context,
                    Icons.inventory_2_outlined,
                    Trans.inventoryAdmin,
                    const Color(0xFFFEF3C7),
                    const Color(0xFFB45309),
                    () {
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const AdminInventoryScreen()));
                    }
                  ),
                  // Quản lý đơn hàng: Màu Cyan/Xanh biển sáng (Xử lý luồng đơn)
                  _buildMenuItem(
                  context,
                    Icons.assignment_outlined,
                    Trans.orderManagementAdmin,
                    const Color(0xFFE0F7FA),
                    const Color(0xFF00ACC1),
                    () {
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const AdminOrdersScreen()));
                    }
                  ),
                  // Quản lý sản phẩm: Màu Xanh lục đậm (Sản phẩm, hàng hóa)
                  _buildMenuItem(
                  context,
                    Icons.inventory_outlined,
                    Trans.productManagementAdmin,
                    const Color(0xFFE8F5E9),
                    const Color(0xFF2E7D32),
                    () {
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const AdminProductScreen()));
                    }
                  ),
                ],
              ),
              const SizedBox(height: 24),
            ],

            const SizedBox(height: 32),
            
            // Logout Button
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton.icon(
                onPressed: onLogout,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFFEE2E2), 
                  foregroundColor: const Color(0xFFD32F2F),
                  elevation: 0,
                  shadowColor: Colors.transparent,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                icon: const Icon(Icons.logout, size: 22, color: Color(0xFFD32F2F)),
                label: Text(Trans.logout, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              ),
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildMenuSection({required BuildContext context, required String title, required List<Widget> children}) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 20, top: 20, bottom: 8),
            child: Text(
              title,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6),
                letterSpacing: 1,
              ),
            ),
          ),
          ...children,
          const SizedBox(height: 8),
        ],
      ),
    );
  }

  Widget _buildMenuItem(
    BuildContext context,
    IconData icon, 
    String title, 
    Color bgColor, 
    Color iconColor, 
    VoidCallback onTap
  ) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 20),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: bgColor,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: iconColor, size: 20),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                title,
                style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15, color: Theme.of(context).colorScheme.onSurface),
              ),
            ),
            Icon(Icons.chevron_right, color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5), size: 20),
          ],
        ),
      ),
    );
  }
}
