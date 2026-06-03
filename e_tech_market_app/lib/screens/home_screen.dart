import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../services/auth_service.dart';
import '../services/banner_service.dart';
import '../services/blog_service.dart';
import '../services/coupon_service.dart';
import '../services/products_service.dart';
import '../services/reviews_service.dart';
import '../services/video_service.dart';
import '../services/wishlist_service.dart';
import '../utils/network_utils.dart';
import 'account/account_screen.dart';
import 'blogs/blog_screen.dart';
import 'orders/order_list_screen.dart';
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

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  Map<String, dynamic>? _user;
  int _selectedIndex = 0;

  bool _isHomeLoading = true;
  String? _homeError;
  List<dynamic> _banners = [];
  List<dynamic> _availableCoupons = [];
  List<dynamic> _categories = [];
  List<dynamic> _featuredProducts = [];
  Set<int> _wishSet = {};
  int _currentBannerIndex = 0;
  int? _selectedHomeCategoryId;
  int _selectedTabIndex = 0;
  Map<int, List<dynamic>> _tabProductsByCategory = {};
  Map<int, bool> _tabLoadingByCategory = {};
  List<dynamic> _latestNews = [];
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
  }

  Future<void> _loadHomeContent() async {
    try {
      final results = await Future.wait<dynamic>([
        BannerService.fetchActiveBanners(),
        CouponService.fetchAvailableCoupons(),
        ProductsService.fetchCategories(),
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
        _categories = (results[2] as List<dynamic>).take(5).toList();
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
        if (_categories.isNotEmpty) {
          _selectedTabIndex = 0;
          final firstCategoryId = (_categories[0]['id'] as num?)?.toInt();
          if (firstCategoryId != null) {
            _tabLoadingByCategory[firstCategoryId] = true;
          }
        }
      });
      if (_categories.isNotEmpty) {
        final firstCategoryId = (_categories[0]['id'] as num?)?.toInt();
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
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(message)),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    }
  }

  void _copyCouponCode(String code) {
    Clipboard.setData(ClipboardData(text: code));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Đã sao chép mã voucher vào bộ nhớ tạm.')),
    );
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
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Không thể cập nhật yêu thích. Vui lòng thử lại.')),
      );
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
    if (index < 0 || index >= _categories.length) return;
    final category = _categories[index] as Map<String, dynamic>?;
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

  Widget _buildFeaturedProductSection() {
    return ProductSection(
      products: _featuredProducts,
      wishedProductIds: _wishSet,
      isLoading: _isHomeLoading,
      onViewAll: () => _onTabSelected(1),
      onProductSelected: _navigateToProductDetail,
      onToggleWishlist: _toggleWishlist,
      onAddToCart: (_) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Tính năng giỏ hàng sẽ được cập nhật sau.')),
        );
      },
    );
  }

  Widget _buildTabbedCategorySection() {
    final category = _categories.isNotEmpty ? _categories[_selectedTabIndex] as Map<String, dynamic> : null;
    final categoryId = (category?['id'] as num?)?.toInt();
    final currentProducts = categoryId != null ? _tabProductsByCategory[categoryId] ?? [] : [];
    final loading = _isHomeLoading || (categoryId != null && (_tabLoadingByCategory[categoryId] ?? false));

    return TabbedProductSection(
      categories: _categories,
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
      onAddToCart: (_) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Tính năng giỏ hàng sẽ được cập nhật sau.')),
        );
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
      onViewAll: () => _onTabSelected(1),
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
      appBar: (_selectedIndex == 4 || _selectedIndex == 3)
          ? null
          : AppBar(
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
        color: const Color(0xFFFFFFFF),
        padding:
            (_selectedIndex == 0 || _selectedIndex == 4 || _selectedIndex == 3)
                ? EdgeInsets.zero
                : const EdgeInsets.all(20),
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
          BottomNavigationBarItem(
              icon: Icon(Icons.home_outlined), label: 'Trang chủ'),
          BottomNavigationBarItem(
              icon: Icon(Icons.grid_view_outlined), label: 'Sản phẩm'),
          BottomNavigationBarItem(
              icon: Icon(Icons.newspaper_outlined), label: 'Tin tức'),
          BottomNavigationBarItem(
              icon: Icon(Icons.receipt_long_outlined), label: 'Đơn hàng'),
          BottomNavigationBarItem(
              icon: Icon(Icons.person_outlined), label: 'Tài khoản'),
        ],
      ),
    );
  }
}
