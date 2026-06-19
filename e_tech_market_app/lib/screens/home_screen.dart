import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../services/auth_service.dart';
import '../config/dio_client.dart';
import '../utils/translation.dart';
import '../services/banner_service.dart';
import '../services/blog_service.dart';
import '../services/coupon_service.dart';
import '../services/products_service.dart';
import '../services/reviews_service.dart';
import '../services/video_service.dart';
import '../services/wishlist_service.dart';
import '../services/cart_service.dart';
import '../utils/network_utils.dart';
import '../utils/app_snackbar.dart';
import '../services/notification_service.dart';
import 'notifications/notifications_screen.dart';
import 'account/account_screen.dart';
import 'blogs/blog_screen.dart';
import 'orders/order_list_screen.dart';
import 'videos/video_screen.dart';
import 'auth/login_screen.dart';
import 'products/products_screen.dart';
import 'products/product_detail_screen.dart';
import 'home_sections/hero_banner_section.dart';
import 'home_sections/coupon_section.dart';
import 'home_sections/category_section.dart';
import 'home_sections/product_section.dart';
import 'home_sections/tabbed_product_section.dart';
import 'home_sections/future_section.dart';
import 'home_sections/news_section.dart';
import 'home_sections/video_section.dart';
import 'home_sections/why_us_section.dart';
import 'home_sections/reviews_section.dart';
import 'home_sections/newsletter_section.dart';
import 'cart/cart_screen.dart';
import 'search/search_screen.dart';
import 'home_sections/flash_sale_section.dart';
import 'products/flash_sale_product_screen.dart';
import 'chatbot/chatbot_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  Map<String, dynamic>? _user;
  int _selectedIndex = 0;
  int _cartItemCount = 0;
  int _unreadNotifCount = 0;
  List<dynamic> _recentNotifications = [];

  bool _isHomeLoading = true;
  String? _homeError;
  List<dynamic> _banners = [];
  List<dynamic> _availableCoupons = [];
  List<dynamic> _categories = [];
  List<dynamic> _apiCategories = [];
  List<dynamic> _featuredProducts = [];
  Set<int> _wishSet = {};
  int _currentBannerIndex = 0;
  int? _selectedHomeCategoryId;
  int _selectedTabIndex = 0;
  Map<int, List<dynamic>> _tabProductsByCategory = {};
  Map<int, bool> _tabLoadingByCategory = {};
  List<dynamic> _latestNews = [];

  // Fixed categories for tabbed section (like web)
  static const _homeTabCategories = [
    {'id': 2, 'name': 'Điện thoại'},
    {'id': 3, 'name': 'Laptop'},
    {'id': 51, 'name': 'PC'},
    {'id': 53, 'name': 'Màn hình'},
    {'id': 52, 'name': 'Máy in'},
  ];

  // Fixed categories getter for TabbedProductSection only
  List<dynamic> get tabCategoriesForTabs => _homeTabCategories;

  bool _newsLoading = false;
  List<dynamic> _homeVideos = [];
  bool _videosLoading = false;
  List<dynamic> _reviews = [];
  bool _reviewsLoading = false;

  Timer? _bannerTimer;

  @override
  void initState() {
    super.initState();
    _loadUser();
    _loadHomeContent();
  }

  @override
  void dispose() {
    _bannerTimer?.cancel();
    super.dispose();
  }

  void _startBannerAutoScroll() {
    _bannerTimer?.cancel();
    if (_banners.length <= 1) return;

    _bannerTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      if (!mounted) return;
      setState(() {
        _currentBannerIndex = (_currentBannerIndex + 1) % _banners.length;
      });
    });
  }

  Future<void> _loadUser() async {
    final user = await AuthService.getCurrentUser();
    if (!mounted) return;
    setState(() {
      _user = user;
    });
    _loadCartCount();
    _loadNotifications();
  }

  Future<void> _loadCartCount() async {
    if (_user == null) return;
    try {
      final cartState = await CartService.fetchCart();
      if (!mounted) return;
      setState(() {
        _cartItemCount = cartState.totalQuantity;
      });
    } catch (_) {}
  }

  Future<void> _loadNotifications() async {
    if (_user == null) return;
    try {
      final response = await NotificationService.fetchNotifications(page: 1, perPage: 10);
      if (!mounted) return;
      setState(() {
        _recentNotifications = response['data'] ?? [];
        _unreadNotifCount = response['unread'] ?? 0;
      });
    } catch (_) {}
  }

  Future<void> _markAllNotifAsRead() async {
    try {
      await NotificationService.markAllAsRead();
      _loadNotifications();
    } catch (_) {}
  }

  Future<void> _markNotifAsRead(int id) async {
    try {
      await NotificationService.markAsRead(id);
      _loadNotifications();
    } catch (_) {}
  }

  Widget _buildNotificationDrawer() {
    int unreadInList = _recentNotifications.where((n) => n['read_at'] == null).length;
    int remainingUnread = _unreadNotifCount - unreadInList;

    return Drawer(
      width: MediaQuery.of(context).size.width * 0.75,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.zero,
      ),
      child: SafeArea(
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: const BoxDecoration(
                border: Border(bottom: BorderSide(color: Color(0xFFE2E8F0))),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Thông báo', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Container(width: 8, height: 8, decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle)),
                          const SizedBox(width: 4),
                          Text('Chưa đọc', style: TextStyle(fontSize: 11, color: Theme.of(context).colorScheme.onSurface)),
                          const SizedBox(width: 12),
                          Container(width: 8, height: 8, decoration: const BoxDecoration(color: Colors.blue, shape: BoxShape.circle)),
                          const SizedBox(width: 4),
                          Text('Đã đọc', style: TextStyle(fontSize: 11, color: Theme.of(context).colorScheme.onSurface)),
                        ],
                      ),
                    ],
                  ),
                  PopupMenuButton<String>(
                    icon: const Icon(Icons.more_vert),
                    onSelected: (value) {
                      if (value == 'read_all') {
                        _markAllNotifAsRead();
                      }
                    },
                    itemBuilder: (context) => [
                      PopupMenuItem(
                        value: 'read_all',
                        child: Text(Trans.markAsRead),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Expanded(
              child: _recentNotifications.isEmpty
                  ? Center(child: Text(Trans.noNotificationsYet, style: TextStyle(color: Theme.of(context).colorScheme.onSurface)))
                  : ListView.separated(
                      padding: const EdgeInsets.all(8),
                      itemCount: _recentNotifications.length,
                      separatorBuilder: (_, __) => const Divider(height: 1),
                      itemBuilder: (context, index) {
                        final notif = _recentNotifications[index];
                        final isRead = notif['read_at'] != null;
                        return ListTile(
                          tileColor: isRead ? Colors.transparent : const Color(0xFFFFF7ED),
                          leading: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Container(
                                width: 10,
                                height: 10,
                                decoration: BoxDecoration(
                                  color: isRead ? Colors.blue : Colors.red,
                                  shape: BoxShape.circle,
                                ),
                              ),
                            ],
                          ),
                          title: Text(notif['title']?.toString() ?? 'Thông báo', style: TextStyle(fontWeight: isRead ? FontWeight.normal : FontWeight.bold, fontSize: 14, color: Theme.of(context).colorScheme.primary)),
                          // subtitle: Text(notif['body']?.toString() ?? '', maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12)),
                          onTap: () async {
                            // 1. Đánh dấu đã đọc ngay tại Home (nếu chưa đọc) để UX mượt mà
                            if (!isRead) {
                              await _markNotifAsRead(notif['id'] as int);
                            }
                            
                            // Nếu thông báo nằm trong một Drawer hoặc BottomSheet, bạn có thể uncomment dòng dưới
                            // Navigator.pop(context); 

                            // 2. Điều hướng sang màn hình chi tiết thông báo
                            if (context.mounted) {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => const NotificationsScreen(),
                                ),
                              );
                            }
                          },
                        );
                      },
                    ),
            ),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: const BoxDecoration(border: Border(top: BorderSide(color: Color(0xFFE2E8F0)))),
              child: Stack(
                alignment: Alignment.center,
                children: [
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () {
                        Navigator.pop(context); // close drawer
                        Navigator.push(context, MaterialPageRoute(builder: (_) => const NotificationsScreen())).then((_) => _loadNotifications());
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFF8FAFC),
                        foregroundColor: const Color(0xFF1E293B),
                        elevation: 0,
                        side: const BorderSide(color: Color(0xFFE2E8F0)),
                      ),
                      child: Text(Trans.viewAll),
                    ),
                  ),
                  if (remainingUnread > 0)
                    Positioned(
                      right: 12,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.red,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          Trans.unreadCount(remainingUnread),
                          style: TextStyle(color: Theme.of(context).colorScheme.onSurface, fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _loadHomeContent() async {
    try {
      final results = await Future.wait<dynamic>([
        BannerService.fetchActiveBanners(),
        CouponService.fetchAvailableCoupons(),
        ProductsService.fetchCategories(orderByReviews: true, limit: 5),
        ProductsService.fetchProducts(limit: 10, isFeatured: 1),
        WishlistService.fetchWishlist(),
        BlogService.fetchBlogPosts(perPage: 5),
        VideoService.fetchVideos(limit: 4),
        ReviewsService.fetchReviews(minRating: 5, limit: 6),
      ]);

      if (!mounted) return;

      setState(() {
        _banners = results[0] as List<dynamic>;
        _availableCoupons = (results[1] as List<dynamic>).take(4).toList();
        // Use fixed categories like web
        _apiCategories = results[2] as List<dynamic>? ?? [];
        _categories = _apiCategories;
        final productResponse = results[3] as Map<String, dynamic>;
        _featuredProducts = productResponse['data'] as List<dynamic>? ?? [];
        _wishSet = (results[4] as List<dynamic>)
            .map<int>((item) => (item['product_id'] as num).toInt())
            .toSet();
        final blogResponse = results[5] as Map<String, dynamic>;
        _latestNews = blogResponse['data'] as List<dynamic>? ?? [];
        _homeVideos = (results[6] as List<dynamic>? ?? []);
        _reviews = (results[7] as List<dynamic>? ?? []);
        _currentBannerIndex = 0;
        _homeError = null;
        _isHomeLoading = false;
        // Load first tab category
        _selectedTabIndex = 0;
        final firstCategoryId = _homeTabCategories.isNotEmpty
            ? (_homeTabCategories[0]['id'] as num?)?.toInt()
            : null;
        if (firstCategoryId != null) {
          _tabLoadingByCategory[firstCategoryId] = true;
        }
      });
      // Load first tab products
      if (_homeTabCategories.isNotEmpty) {
        final firstCategoryId = (_homeTabCategories[0]['id'] as num?)?.toInt();
        if (firstCategoryId != null) {
          await _loadTabProductsForCategory(firstCategoryId);
        }
      }
      _startBannerAutoScroll();
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _homeError = error.toString();
        _isHomeLoading = false;
      });
    }
  }

  Future<void> _saveCoupon(String code) async {
    try {
      final message = await CouponService.saveCoupon(code);
      if (!mounted) return;
      AppSnackBar.showSuccess(context, message);
    } catch (error) {
      if (!mounted) return;
      AppSnackBar.showError(context, error.toString().replaceFirst('Exception: ', ''));
    }
  }

  void _copyCouponCode(String code) {
    Clipboard.setData(ClipboardData(text: code));
    if (!mounted) return;
    AppSnackBar.showInfo(context, 'Đã sao chép mã voucher vào bộ nhớ tạm.');
  }

  void _onTabSelected(int index) {
    setState(() {
      if (index != 1) {
        _selectedHomeCategoryId = null;
      }
      _selectedIndex = index;
    });
  }

  String _getAvatarInitial() {
    if (_user == null) return 'U';
    final name = _user!['name'] as String?;
    if (name == null || name.isEmpty) return 'U';

    final parts = name.split(' ');
    if (parts.isEmpty) return 'U';

    final lastName = parts.last;
    if (lastName.isEmpty) return 'U';

    return lastName[0].toUpperCase();
  }

  Widget _buildHeroSection() {
    return HeroBannerSection(
      banners: _banners,
      isLoading: _isHomeLoading,
      onShopNow: () => _onTabSelected(1),
      onBannerIndexChanged: (index) {
        setState(() {
          _currentBannerIndex = index;
        });
      },
      currentBannerIndex: _currentBannerIndex,
    );
  }

  Widget _buildCouponSection() {
    return CouponSection(
      coupons: _availableCoupons,
      isLoading: _isHomeLoading,
      error: _homeError,
      onSaveCoupon: _saveCoupon,
      onCopyCoupon: _copyCouponCode,
    );
  }

  Widget _buildCategorySection() {
    return CategorySection(
      categories: _categories,
      isLoading: _isHomeLoading,
      onViewAll: () {
        setState(() {
          _selectedHomeCategoryId = null;
          _selectedIndex = 1;
        });
      },
      onCategorySelected: (category) {
        setState(() {
          _selectedHomeCategoryId = (category['id'] as num?)?.toInt();
          _selectedIndex = 1;
        });
      },
    );
  }

  

  Future<void> _toggleWishlist(int productId) async {
    if (productId <= 0) return;

    final wasWished = _wishSet.contains(productId);
    setState(() {
      if (wasWished) {
        _wishSet.remove(productId);
      } else {
        _wishSet.add(productId);
      }
    });

    final status = await WishlistService.toggleWishlist(productId);
    if (!mounted) return;

    if (status == null) {
      setState(() {
        if (wasWished) {
          _wishSet.add(productId);
        } else {
          _wishSet.remove(productId);
        }
      });
      AppSnackBar.showError(context, 'Không thể cập nhật yêu thích. Vui lòng thử lại.');
    }
  }

  Future<void> _loadTabProductsForCategory(int categoryId) async {
    setState(() {
      _tabLoadingByCategory[categoryId] = true;
    });

    try {
      final response = await ProductsService.fetchProducts(
        page: 1,
        limit: 8,
        categoryId: categoryId.toString(),
        isFeatured: 1,
      );
      final data = response['data'] as List<dynamic>? ?? [];
      if (!mounted) return;
      setState(() {
        _tabProductsByCategory[categoryId] = data;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _tabProductsByCategory[categoryId] = [];
      });
    } finally {
      if (!mounted) return;
      setState(() {
        _tabLoadingByCategory[categoryId] = false;
      });
    }
  }

  void _selectTab(int index) {
    // Use fixed tab categories
    if (index < 0 || index >= tabCategoriesForTabs.length) return;
    final category = tabCategoriesForTabs[index] as Map<String, dynamic>?;
    final categoryId = (category?['id'] as num?)?.toInt();
    if (categoryId == null) return;

    setState(() {
      _selectedTabIndex = index;
    });

    if (_tabProductsByCategory[categoryId] == null) {
      _loadTabProductsForCategory(categoryId);
    }
  }

  void _navigateToProductDetail(Map<String, dynamic> product) {
    final slug = product['slug']?.toString() ?? '';
    if (slug.isEmpty) return;
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ProductDetailScreen(
          slug: slug,
          variantId: null,
        ),
      ),
    );
  }

  void _navigateToFlashSaleProductDetail(Map<String, dynamic> item) {
    final product = item['product'] as Map<String, dynamic>? ?? {};
    final variant = item['variant'] as Map<String, dynamic>?;
    final slug = product['slug']?.toString() ?? '';
    if (slug.isEmpty) return;

    // Lấy flashSalePrice từ item
    final flashSalePrice = double.tryParse(item['flash_sale_price']?.toString() ?? '');

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ProductDetailScreen(
          slug: slug,
          variantId: variant?['id']?.toString(),
          flashSalePrice: flashSalePrice,
          showFlashSale: true,
        ),
      ),
    );
  }

  Widget _buildFeaturedProductSection() {
  return ProductSection(
    products: _featuredProducts,
    wishedProductIds: _wishSet,
    isLoading: _isHomeLoading,
    onViewAll: () => _onTabSelected(1),
    onProductSelected: _navigateToProductDetail,
    onToggleWishlist: _toggleWishlist,
    
    // Cập nhật phần này:
    onAddToCart: (product) async {
      try {
        final int productId = (product['id'] as num).toInt();
        
        // Gọi dịch vụ giỏ hàng (đảm bảo đã import CartService)
        await CartService.addToCart(productId, 1);
        _loadCartCount();
        
        if (!mounted) return;
        AppSnackBar.showSuccess(context, 'Đã thêm vào giỏ hàng thành công!');
      } catch (e) {
        if (!mounted) return;
        AppSnackBar.showError(context, 'Lỗi: ${e.toString().replaceFirst('Exception: ', '')}');
      }
    },
  );
  }

  Widget _buildTabbedCategorySection() {
    // Use fixed tab categories for products display (like web)
    final category = tabCategoriesForTabs.isNotEmpty ? tabCategoriesForTabs[_selectedTabIndex] as Map<String, dynamic> : null;
    final categoryId = (category?['id'] as num?)?.toInt();
    final currentProducts = categoryId != null ? _tabProductsByCategory[categoryId] ?? [] : [];
    final loading = _isHomeLoading || (categoryId != null && (_tabLoadingByCategory[categoryId] ?? false));

    return TabbedProductSection(
      categories: tabCategoriesForTabs,
      selectedTabIndex: _selectedTabIndex,
      onTabSelected: _selectTab,
      products: currentProducts,
      wishedProductIds: _wishSet,
      isLoading: loading,
      onViewAll: () {
        if (categoryId != null) {
          setState(() {
            _selectedHomeCategoryId = categoryId;
            _selectedIndex = 1;
          });
        }
      },
      onProductSelected: _navigateToProductDetail,
      onToggleWishlist: _toggleWishlist,
      
      // CẬP NHẬT HÀM DƯỚI ĐÂY:
      onAddToCart: (product) async {
        try {
          final int productId = (product['id'] as num).toInt();
          
          // Gọi dịch vụ thêm sản phẩm vào giỏ
          await CartService.addToCart(productId, 1);
          _loadCartCount();
          
          if (!mounted) return;
          AppSnackBar.showSuccess(context, 'Đã thêm sản phẩm vào giỏ hàng!');
        } catch (e) {
          if (!mounted) return;
          AppSnackBar.showError(context, 'Lỗi: ${e.toString().replaceFirst('Exception: ', '')}');
        }
      },
    );
  }

  Widget _buildFlashSaleSection() {
    return FlashSaleSection(
      onViewAll: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const FlashSaleProductScreen()),
        );
      },
      onFlashSaleItemSelected: (item) {
        _navigateToFlashSaleProductDetail(item);
      },
      onAddToCart: (item) async {
        try {
          final variantId = item['variant_id'] as int?;
          final productId = (item['product_id'] as num?)?.toInt() ?? 0;
          if (productId <= 0) return;

          await CartService.addToCart(productId, 1, variantId: variantId);
          _loadCartCount();

          if (!mounted) return;
          AppSnackBar.showSuccess(context, 'Đã thêm vào giỏ hàng thành công!');
        } catch (e) {
          if (!mounted) return;
          AppSnackBar.showError(context, 'Lỗi: ${e.toString().replaceFirst('Exception: ', '')}');
        }
      },
    );
  }

  Widget _buildFutureSection() {
    return const FutureSection();
  }

  Widget _buildNewsSection() {
    return NewsSection(
      articles: _latestNews,
      isLoading: _newsLoading,
      onViewAll: () => _onTabSelected(1),
    );
  }

  Widget _buildVideoSection() {
    return VideoSection(
      videos: _homeVideos,
      isLoading: _videosLoading,
      onViewAll: () => Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => const VideoScreen()),
      ),
    );
  }

  Widget _buildWhyUsSection() {
    return const WhyUsSection();
  }

  Widget _buildReviewsSection() {
    return ReviewsSection(
      reviews: _reviews,
      isLoading: _reviewsLoading,
    );
  }

  Widget _buildPageBody() {
    switch (_selectedIndex) {
      case 0:
        return SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _buildHeroSection(),
              const SizedBox(height: 20),
              _buildCouponSection(),
              const SizedBox(height: 20),
              _buildFlashSaleSection(),
              const SizedBox(height: 20),
              _buildCategorySection(),
              const SizedBox(height: 20),
              _buildFeaturedProductSection(),
              const SizedBox(height: 20),
              _buildFutureSection(),
              const SizedBox(height: 20),
              _buildTabbedCategorySection(),
              const SizedBox(height: 20),
              _buildNewsSection(),
              const SizedBox(height: 20),
              _buildVideoSection(),
              const SizedBox(height: 20),
              _buildWhyUsSection(),
              const SizedBox(height: 20),
              _buildReviewsSection(),
              const SizedBox(height: 20),
              const NewsletterSection(),
              
            ],
          ),
        );
      case 1:
        return ProductsScreen(
          key: ValueKey(_selectedHomeCategoryId),
          initialCategoryId: _selectedHomeCategoryId,
        );
      case 2:
        return const BlogScreen();
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

  Future<void> _logout() async {
    await AuthService.clearSession();
    DioClient.reset();
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (_) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    String? avatarUrl;
    if (_user != null) {
      avatarUrl = _user!['avatar'] as String? ??
          _user!['avatar_url'] as String? ??
          _user!['profile_image'] as String? ??
          _user!['image'] as String?;
      if (avatarUrl != null) {
        avatarUrl = NetworkUtils.fixDeviceUrl(avatarUrl);
      }
    }

    return Scaffold(
      key: _scaffoldKey,
      endDrawer: _buildNotificationDrawer(),
      appBar: (_selectedIndex == 4 || _selectedIndex == 3)
          ? null
          : AppBar(
              backgroundColor: Theme.of(context).colorScheme.surface,
              foregroundColor: Theme.of(context).colorScheme.onSurface,
              elevation: 0,

              title: Image.asset(
                Theme.of(context).brightness == Brightness.dark
                    ? 'assets/images/logo-trang.png'
                    : 'assets/images/logo.png',
                height: 40,
                fit: BoxFit.contain,
              ),
              actions: [
                IconButton(
                  icon: const Icon(Icons.search_outlined),
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const SearchScreen()),
                    );
                  },
                  tooltip: Trans.search,
                ),
                IconButton(
                  icon: Badge(
                    isLabelVisible: _unreadNotifCount > 0,
                    label: Text(_unreadNotifCount.toString()),
                    backgroundColor: const Color(0xFFFF2424),
                    child: const Icon(Icons.notifications_outlined),
                  ),
                  onPressed: () {
                    _scaffoldKey.currentState?.openEndDrawer();
                  },
                  tooltip: Trans.notifications,
                ),
                IconButton(
                  icon: Badge(
                    isLabelVisible: _cartItemCount > 0,
                    label: Text(_cartItemCount.toString()),
                    backgroundColor: const Color(0xFFFF2424),
                    child: const Icon(Icons.shopping_cart_outlined),
                  ),
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => const CartScreen()),
                    ).then((_) => _loadCartCount());
                  },
                  tooltip: Trans.cart,
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
                      onBackgroundImageError:
                          avatarUrl != null ? (_, __) {} : null,
                      child: avatarUrl == null || avatarUrl.isEmpty
                          ? Text(
                              _getAvatarInitial(),
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16),
                            )
                          : null,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
              ],
            ),
      body: Container(
        color: Theme.of(context).colorScheme.surface,
        padding:
            (_selectedIndex == 0 || _selectedIndex == 4 || _selectedIndex == 3)
                ? EdgeInsets.zero
                : const EdgeInsets.all(20),
        child: _user == null
            ? const Center(child: CircularProgressIndicator())
            : _buildPageBody(),
      ),
      floatingActionButton: _buildChatbotFAB(),
      bottomNavigationBar:  BottomNavigationBar(
        currentIndex: _selectedIndex,
        onTap: _onTabSelected,
        selectedItemColor: Color(0xFFEA6C00), // Đổi thành màu cam khi active
        unselectedItemColor: Theme.of(context).colorScheme.onSurfaceVariant,
        type: BottomNavigationBarType.fixed,
        items: [
          BottomNavigationBarItem(
              icon: Icon(Icons.home_outlined), label: Trans.home),
          BottomNavigationBarItem(
              icon: Icon(Icons.grid_view_outlined), label: Trans.products),
          BottomNavigationBarItem(
              icon: Icon(Icons.newspaper_outlined), label: 'Tin tức'),
          BottomNavigationBarItem(
              icon: Icon(Icons.receipt_long_outlined), label: Trans.orders),
          BottomNavigationBarItem(
              icon: Icon(Icons.person_outlined), label: Trans.account),
        ],
      ),
    );
  }

  Widget _buildChatbotFAB() {
    return Container(
      margin: const EdgeInsets.only(bottom: 20, right: 8),
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Pulse animation using TweenAnimationBuilder
          TweenAnimationBuilder<double>(
            tween: Tween(begin: 1.0, end: 1.5),
            duration: const Duration(milliseconds: 1500),
            builder: (context, value, child) {
              return Transform.scale(
                scale: value,
                child: Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: const Color(0xFFF26522).withValues(alpha: 1.5 - value),
                  ),
                ),
              );
            },
            onEnd: () {
              // Note: to loop this we would need an AnimationController, 
              // but TweenAnimationBuilder works for a simple entry pulse.
            },
          ),
          FloatingActionButton(
            heroTag: 'chatbot_fab',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const ChatbotScreen()),
              );
            },
            backgroundColor: Colors.transparent,
            elevation: 8,
            shape: const CircleBorder(),
            child: Container(
              width: 56,
              height: 56,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  colors: [Color(0xFFF26522), Color(0xFFFF8A50)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: const Icon(
                Icons.smart_toy_rounded,
                color: Colors.white,
                size: 28,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
