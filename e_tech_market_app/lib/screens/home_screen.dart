import 'package:flutter/material.dart';

import '../services/auth_service.dart';
import '../utils/network_utils.dart';
import 'account/account_screen.dart';
import 'account/orders/order_list_screen.dart';
import 'auth/login_screen.dart';
import 'products/products_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  Map<String, dynamic>? _user;
  int _selectedIndex = 0;

  @override
  void initState() {
    super.initState();
    _loadUser();
  }

  Future<void> _loadUser() async {
    final user = await AuthService.getCurrentUser();
    if (mounted) {
      setState(() {
        _user = user;
      });
    }
  }

  Future<void> _logout() async {
    await AuthService.clearSession();
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (_) => false,
    );
  }

  void _onTabSelected(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  String _getAvatarInitial() {
    if (_user == null) return 'U';
    final name = _user!['name'] as String?;
    if (name == null || name.isEmpty) return 'U';
    
    // Get last name and return first character
    final parts = name.split(' ');
    if (parts.isEmpty) return 'U';
    
    final lastName = parts.last;
    if (lastName.isEmpty) return 'U';
    
    return lastName[0].toUpperCase();
  }

  Widget _buildPageBody() {
    final name = _user != null ? _user!['name'] as String? : 'Khách hàng';

    switch (_selectedIndex) {
      case 0:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Xin chào đến E-TECH MARKET!', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            const Text('Khám phá sản phẩm mới nhất và ưu đãi hấp dẫn hôm nay.'),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  const BoxShadow(color: Colors.black12, blurRadius: 16, offset: Offset(0, 8)),
                ],
              ),
              child: const Text('Nội dung trang chủ hiển thị tại đây.'),
            ),
          ],
        );
      case 1:
        return const ProductsScreen();
      case 2:
        return const Center(child: Text('Cập nhật tin tức và thông báo mới nhất.', style: TextStyle(fontSize: 16)));
      case 3:
        return const OrderListScreen();
      case 4:
        return _user == null
            ? const Center(child: CircularProgressIndicator())
            : AccountScreen(user: _user!, onLogout: _logout);
      default:
        return const SizedBox.shrink();
    }
  }

  @override
  Widget build(BuildContext context) {
    // Get avatar from various possible field names
    String? avatarUrl;
    if (_user != null) {
      avatarUrl = _user!['avatar'] as String? ??
          _user!['avatar_url'] as String? ??
          _user!['profile_image'] as String? ??
          _user!['image'] as String?;
      if (avatarUrl != null) {
        avatarUrl = fixDeviceUrl(avatarUrl);
      }
    }
    
    return Scaffold(
      appBar: _selectedIndex == 4 ? null : AppBar(
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
        title: Image.asset(
          'assets/images/logo.png',
          height: 40,
          fit: BoxFit.contain,
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.search_outlined),
            onPressed: () {},
            tooltip: 'Tìm kiếm',
          ),
          IconButton(
            icon: const Icon(Icons.shopping_cart_outlined),
            onPressed: () {},
            tooltip: 'Giỏ hàng',
          ),
          GestureDetector(
            onTap: () => _onTabSelected(4),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: CircleAvatar(
                radius: 20,
                backgroundColor: const Color(0xFFEF7A45),
                backgroundImage: avatarUrl != null && avatarUrl.isNotEmpty 
                    ? NetworkImage(avatarUrl)
                    : null,
                onBackgroundImageError: avatarUrl != null
                    ? (_, __) {}
                    : null,
                child: avatarUrl == null || avatarUrl.isEmpty
                    ? Text(
                        _getAvatarInitial(),
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                      )
                    : null,
              ),
            ),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Container(
        color: const Color(0xFFFAF1EB),
        padding: _selectedIndex == 4 ? EdgeInsets.zero : const EdgeInsets.all(20),
        child: _user == null
            ? const Center(child: CircularProgressIndicator())
            : _buildPageBody(),
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedIndex,
        onTap: _onTabSelected,
        selectedItemColor: const Color(0xFFEF7A45),
        unselectedItemColor: Colors.black54,
        type: BottomNavigationBarType.fixed,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home_outlined), label: 'Trang chủ'),
          BottomNavigationBarItem(icon: Icon(Icons.grid_view_outlined), label: 'Sản phẩm'),
          BottomNavigationBarItem(icon: Icon(Icons.newspaper_outlined), label: 'Tin tức'),
          BottomNavigationBarItem(icon: Icon(Icons.receipt_long_outlined), label: 'Đơn hàng'),
          BottomNavigationBarItem(icon: Icon(Icons.person_outlined), label: 'Tài khoản'),
        ],
      ),
    );
  }
}
