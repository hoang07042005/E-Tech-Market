import 'package:flutter/material.dart';
import '../../utils/network_utils.dart';
import 'orders/order_list_screen.dart';
import 'profile/profile_screen.dart';

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
      avatarUrl = fixDeviceUrl(avatarUrl);
    } else {
      avatarUrl = null;
    }

    final name = user['name'] ?? 'Khách hàng';
    final email = user['email'] ?? 'Chưa cập nhật email';

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
              child: CircleAvatar(
                radius: 50,
                backgroundColor: const Color(0xFFEF7A45),
                backgroundImage: avatarUrl != null ? NetworkImage(avatarUrl) : null,
                onBackgroundImageError: avatarUrl != null ? (_, __) {} : null,
                child: avatarUrl == null
                    ? Text(
                        _getAvatarInitial(),
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 36),
                      )
                    : null,
              ),
            ),
            const SizedBox(height: 16),
            
            // Name and Email
            Text(
              name,
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
            ),
            const SizedBox(height: 4),
            Text(
              email,
              style: const TextStyle(fontSize: 14, color: Colors.grey),
            ),
            
            const SizedBox(height: 32),

            // Account Section
            _buildMenuSection(
              title: 'TÀI KHOẢN',
              children: [
                _buildMenuItem(Icons.person_outline, 'Thông tin cá nhân', () {
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const ProfileScreen()));
                }),
                _buildMenuItem(Icons.receipt_long_outlined, 'Đơn hàng', () {
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const OrderListScreen()));
                }),
                _buildMenuItem(Icons.local_activity_outlined, 'Kho voucher', () {}),
              ],
            ),
            
            const SizedBox(height: 24),
            
            // Settings Section
            _buildMenuSection(
              title: 'THIẾT LẬP',
              children: [
                _buildMenuItem(Icons.security_outlined, 'Bảo mật', () {}),
                _buildMenuItem(Icons.article_outlined, 'Các điều khoản', () {}),
                _buildMenuItem(Icons.settings_outlined, 'Cài đặt', () {}),
              ],
            ),

            const SizedBox(height: 32),
            
            // Logout Button
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton.icon(
                onPressed: onLogout,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFFFF0E6),
                  foregroundColor: const Color(0xFFD32F2F),
                  elevation: 0,
                  shadowColor: Colors.transparent,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                icon: const Icon(Icons.logout, size: 22),
                label: const Text('Đăng xuất', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              ),
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildMenuSection({required String title, required List<Widget> children}) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
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
                color: Colors.grey.shade600,
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

  Widget _buildMenuItem(IconData icon, String title, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 20),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF0E6),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: const Color(0xFFC45A1A), size: 20),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15, color: Color(0xFF1E293B)),
              ),
            ),
            const Icon(Icons.chevron_right, color: Colors.grey, size: 20),
          ],
        ),
      ),
    );
  }
}
