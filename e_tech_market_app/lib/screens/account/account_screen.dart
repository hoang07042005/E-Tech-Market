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

import '../../services/checkout_service.dart';

class AccountScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final VoidCallback onLogout;

  const AccountScreen({
    super.key,
    required this.user,
    required this.onLogout,
  });


  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  Map<String, dynamic>? _loyaltyData;
  bool _isLoadingLoyalty = true;

  @override
  void initState() {
    super.initState();
    _fetchLoyalty();
  }

  Future<void> _fetchLoyalty() async {
    try {
      final data = await CheckoutService.fetchLoyaltyData();
      if (mounted) {
        setState(() {
          _loyaltyData = data;
          _isLoadingLoyalty = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _isLoadingLoyalty = false;
        });
      }
    }
  }

  String _formatCurrency(dynamic value) {
    if (value == null) return '0';
    final n = value is num ? value.toDouble() : double.tryParse(value.toString()) ?? 0.0;
    return n.toStringAsFixed(0).replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (match) => '${match[1]}.');
  }

  String _getAvatarInitial() {
    final name = widget.user['name'] as String?;
    if (name == null || name.isEmpty) return 'U';
    
    final parts = name.split(' ');
    if (parts.isEmpty) return 'U';
    
    final lastName = parts.last;
    if (lastName.isEmpty) return 'U';
    
    return lastName[0].toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    String? avatarUrl = widget.user['avatar'] as String? ??
        widget.user['avatar_url'] as String? ??
        widget.user['profile_image'] as String? ??
        widget.user['image'] as String?;
    
    if (avatarUrl != null && avatarUrl.isNotEmpty) {
      avatarUrl = NetworkUtils.fixDeviceUrl(avatarUrl);
    } else {
      avatarUrl = null;
    }

    final name = widget.user['name'] ?? Trans.guestUser;
    final email = widget.user['email'] ?? Trans.noEmail;

    // Kiểm tra xem người dùng có vai trò là admin không
    bool isAdmin = false;
    final roles = widget.user['roles'];
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
            const SizedBox(height: 16),

            // Điểm thưởng & Hạng thành viên
            if (_isLoadingLoyalty)
              const CircularProgressIndicator()
            else if (_loyaltyData != null && _loyaltyData!.isNotEmpty)
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 0),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(color: Colors.black26, blurRadius: 10, offset: const Offset(0, 5)),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: Stack(
                    children: [
                      // Lớp hình nền mờ ảo
                      Positioned.fill(
                        child: Opacity(
                          opacity: 0.5,
                          child: Image.asset(
                            'assets/images/screen1.png',
                            fit: BoxFit.cover,
                          ),
                        ),
                      ),
                      // Lớp Gradient phủ lên ảnh nền
                      Positioned.fill(
                        child: Container(
                          decoration: const BoxDecoration(
                            gradient: LinearGradient(
                              colors: [Color(0xF00F172A), Color(0x661E293B)], // Có độ trong suốt
                              begin: Alignment.bottomLeft,
                              end: Alignment.topRight,
                            ),
                          ),
                        ),
                      ),
                      // Nội dung chính
                      Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('E-TECH ECOSYSTEM', style: TextStyle(color: Color(0xFFD0C6AB), fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: 1.2)),
                                    const SizedBox(height: 4),
                                    const Text('Thẻ Thành Viên E-Tech', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                                  ],
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: const Color(0xFFFFE16D).withOpacity(0.3)),
                                  ),
                                  child: Row(
                                    children: [
                                      Text('${_loyaltyData!['current_points']}', style: const TextStyle(color: Color(0xFFFFE16D), fontSize: 16, fontWeight: FontWeight.bold)),
                                      const SizedBox(width: 4),
                                      const Text('Điểm', style: TextStyle(color: Color(0xFFFFE16D), fontSize: 10)),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 24),
                            Text(
                              _loyaltyData!['membership_rank']?['rank_name'] != null ? 'Thành viên (${_loyaltyData!['membership_rank']['rank_name']})' : 'Thành viên',
                              style: const TextStyle(color: Color(0xFFE3B707), fontSize: 22, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                const Text('Chi tiêu tích lũy: ', style: TextStyle(color: Color(0xFFD0C6AB), fontSize: 13)),
                                Text('${_formatCurrency(_loyaltyData!['total_spent'])} đ', style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                              ],
                            ),
                            const SizedBox(height: 16),
                            Builder(builder: (context) {
                              double parseDouble(dynamic value) {
                                if (value == null) return 0.0;
                                if (value is num) return value.toDouble();
                                return double.tryParse(value.toString()) ?? 0.0;
                              }

                      final nextRank = _loyaltyData!['next_rank'];
                      final totalSpent = parseDouble(_loyaltyData!['total_spent']);
                      if (nextRank == null) {
                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              height: 6,
                              width: double.infinity,
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(colors: [Color(0xFFE9C400), Color(0xFFFFE16D)]),
                                borderRadius: BorderRadius.circular(3),
                              ),
                            ),
                            const SizedBox(height: 12),
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.center,
                              children: [
                                const Icon(Icons.verified_outlined, color: Color(0xFFFFE16D), size: 16),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    'Chúc mừng! Bạn đang ở hạng thẻ cao nhất.',
                                    style: TextStyle(color: const Color(0xFFD0C6AB).withValues(alpha: 0.8), fontSize: 12),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        );
                      }
                      
                      final minSpend = parseDouble(nextRank['min_spend']);
                      final progress = minSpend > 0 ? (totalSpent / minSpend).clamp(0.0, 1.0) : 1.0;
                      final remaining = (minSpend - totalSpent).clamp(0.0, double.infinity);

                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Stack(
                            children: [
                              Container(height: 6, width: double.infinity, decoration: BoxDecoration(color: const Color(0xFF1F2B3C), borderRadius: BorderRadius.circular(3))),
                              FractionallySizedBox(
                                widthFactor: progress,
                                child: Container(height: 6, decoration: BoxDecoration(gradient: const LinearGradient(colors: [Color(0xFFE9C400), Color(0xFFFFE16D)]), borderRadius: BorderRadius.circular(3))),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('Tiến trình hạng ${nextRank['rank_name'] ?? ''}', style: const TextStyle(color: Color(0xFFD0C6AB), fontSize: 12)),
                              Text('Cần thêm ${_formatCurrency(remaining)} đ', style: const TextStyle(color: Color(0xFFFFE16D), fontSize: 12, fontWeight: FontWeight.bold)),
                            ],
                          ),
                        ],
                      );
                    }),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),

            const SizedBox(height: 24),

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
                onPressed: widget.onLogout,
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
