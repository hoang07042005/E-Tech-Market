import 'dart:async';

import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_html/flutter_html.dart';
import '../../services/auth_service.dart';
import '../auth/login_screen.dart';
import '../../utils/app_dialogs.dart';
import '../../services/cart_service.dart';
import '../../services/products_service.dart';
import '../../services/reviews_service.dart';
import '../../services/wishlist_service.dart';
import '../../utils/network_utils.dart';
import '../../utils/app_snackbar.dart';
import '../../utils/translation.dart';
import 'product_new_detail_screen.dart';
import '../../../config/api_config.dart';

String formatCurrency(double value) {
  return value.toStringAsFixed(0).replaceAllMapped(
        RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
        (match) => '${match[1]}.',
      );
}

double _toDouble(dynamic value) {
  if (value is num) return value.toDouble();
  return double.tryParse(value?.toString().replaceAll(',', '') ?? '') ?? 0;
}

int _toInt(dynamic value) {
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '') ?? 0;
}

String _imageFrom(dynamic value) {
  final raw = value?.toString().trim() ?? '';
  return raw.isEmpty ? '' : NetworkUtils.fixDeviceUrl(raw);
}

String _plainTextFromHtml(String value) {
  return value
      .replaceAll(RegExp(r'<br\s*/?>', caseSensitive: false), '\n')
      .replaceAll(RegExp(r'</p\s*>', caseSensitive: false), '\n\n')
      .replaceAll(RegExp(r'<[^>]*>'), '')
      .replaceAll('&nbsp;', ' ')
      .replaceAll('&amp;', '&')
      .replaceAll('&lt;', '<')
      .replaceAll('&gt;', '>')
      .replaceAll('&quot;', '"')
      .trim();
}

String _timeAgoVi(String value) {
  final date = DateTime.tryParse(value);
  if (date == null) return '';
  final diff = DateTime.now().difference(date);
  if (diff.inDays >= 30) return '${(diff.inDays / 30).floor()} ${Trans.monthsAgo}';
  if (diff.inDays >= 1) return '${diff.inDays} ${Trans.daysAgo}';
  if (diff.inHours >= 1) return '${diff.inHours} ${Trans.hoursAgo}';
  if (diff.inMinutes >= 1) return '${diff.inMinutes} ${Trans.minutesAgo}';
  return Trans.justNow;
}

String _ratingLabel(num value) {
  if (value >= 5) return Trans.ratingExcellent;
  if (value >= 4) return Trans.ratingGood;
  if (value >= 3) return Trans.ratingAverage;
  if (value >= 2) return Trans.ratingBad;
  return Trans.ratingTerrible;
}

class Product {
  final int id;
  final String name;
  final String slug;
  final String? shortDescription;
  final String? description;
  final String? richHtml;
  final String mainImageUrl;
  final List<ProductImage> images;
  final double price;
  final String? sku;
  final int stockQuantity;
  final String? brand;
  final String? categoryName;
  final String? categorySlug;
  final int categoryId;
  final List<ProductVariant> variants;
  final List<ProductSpecRow> specs;
  final List<ProductFaq> faqs;
  final List<ProductNews> news;
  final List<ProductReview> reviews;
  final List<FlashSaleItem> flashSaleItems;

  Product({
    required this.id,
    required this.name,
    required this.slug,
    this.shortDescription,
    this.description,
    this.richHtml,
    required this.mainImageUrl,
    required this.images,
    required this.price,
    this.sku,
    required this.stockQuantity,
    this.brand,
    this.categoryName,
    this.categorySlug,
    required this.categoryId,
    required this.variants,
    required this.specs,
    this.faqs = const [],
    this.news = const [],
    this.reviews = const [],
    this.flashSaleItems = const [],
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    final images = (json['images'] as List<dynamic>? ?? [])
        .map((item) => ProductImage.fromJson(item as Map<String, dynamic>))
        .where((image) => image.imageUrl.isNotEmpty)
        .toList();
    final variants = (json['variants'] as List<dynamic>? ?? [])
        .map((item) => ProductVariant.fromJson(item as Map<String, dynamic>))
        .toList();
    final mainImage = _resolveMainImage(json, images, variants);
    final category = json['category'] as Map<String, dynamic>?;

    return Product(
      id: _toInt(json['id']),
      name: json['name']?.toString() ?? '',
      slug: json['slug']?.toString() ?? '',
      shortDescription: json['short_description']?.toString(),
      description: json['description']?.toString(),
      richHtml: json['rich_html']?.toString(),
      mainImageUrl: mainImage,
      images: images,
      price: _toDouble(json['price']),
      sku: json['sku']?.toString(),
      stockQuantity: _toInt(json['stock_quantity']),
      brand: json['brand']?.toString(),
      categoryName: category?['name']?.toString(),
      categorySlug: category?['slug']?.toString(),
      categoryId: _toInt(json['category_id']),
      variants: variants,
      specs: (json['specs'] as List<dynamic>? ?? [])
          .map((item) => ProductSpecRow.fromJson(item as Map<String, dynamic>))
          .toList(),
      faqs: (json['faqs'] as List<dynamic>? ?? [])
          .map((item) => ProductFaq.fromJson(item as Map<String, dynamic>))
          .toList(),
      news: (json['news'] as List<dynamic>? ?? [])
          .map((item) => ProductNews.fromJson(item as Map<String, dynamic>))
          .toList(),
      reviews: (json['reviews'] as List<dynamic>? ?? [])
          .map((item) => ProductReview.fromJson(item as Map<String, dynamic>))
          .toList(),
      flashSaleItems: (json['flash_sale_items'] as List<dynamic>? ?? [])
          .map((item) => FlashSaleItem.fromJson(item as Map<String, dynamic>))
          .toList(),
    );
  }

  static String _resolveMainImage(
    Map<String, dynamic> json,
    List<ProductImage> images,
    List<ProductVariant> variants,
  ) {
    final direct = _imageFrom(json['main_image_url']);
    if (direct.isNotEmpty) return direct;
    for (final variant in variants) {
      if ((variant.imageUrl ?? '').isNotEmpty) return variant.imageUrl!;
    }
    return images.isNotEmpty ? images.first.imageUrl : '';
  }
}

class ProductImage {
  final int id;
  final String imageUrl;

  ProductImage({required this.id, required this.imageUrl});

  factory ProductImage.fromJson(Map<String, dynamic> json) {
    return ProductImage(
      id: _toInt(json['id']),
      imageUrl: _imageFrom(json['image_url'] ?? json['url']),
    );
  }
}

class ProductVariant {
  final int id;
  final String name;
  final String? color;
  final String? storage;
  final double price;
  final double effectivePrice;
  final int stockQuantity;
  final String? imageUrl;

  ProductVariant({
    required this.id,
    required this.name,
    this.color,
    this.storage,
    required this.price,
    required this.effectivePrice,
    required this.stockQuantity,
    this.imageUrl,
  });

  factory ProductVariant.fromJson(Map<String, dynamic> json) {
    final price = _toDouble(json['price']);
    final effectivePrice = _toDouble(json['effective_price']);
    final name = json['variant_name']?.toString() ??
        json['name']?.toString() ??
        [
          json['color']?.toString(),
          json['storage']?.toString(),
        ].where((part) => part != null && part.isNotEmpty).join(' - ');

    return ProductVariant(
      id: _toInt(json['id']),
      name: name.isEmpty ? Trans.defaultVariant : name,
      color: json['color']?.toString(),
      storage: json['storage']?.toString(),
      price: price,
      effectivePrice: effectivePrice > 0 ? effectivePrice : price,
      stockQuantity: _toInt(json['stock_quantity']),
      imageUrl: _imageFrom(json['image_url']).isEmpty
          ? null
          : _imageFrom(json['image_url']),
    );
  }
}

class ProductSpecRow {
  final int id;
  final String? specGroup;
  final String? specKey;
  final String? specValue;
  final String? specUnit;
  final int? productVariantId;

  ProductSpecRow({
    required this.id,
    this.specGroup,
    this.specKey,
    this.specValue,
    this.specUnit,
    this.productVariantId,
  });

  factory ProductSpecRow.fromJson(Map<String, dynamic> json) {
    return ProductSpecRow(
      id: _toInt(json['id']),
      specGroup: json['spec_group']?.toString(),
      specKey: json['spec_key']?.toString(),
      specValue: json['spec_value']?.toString(),
      specUnit: json['spec_unit']?.toString(),
      productVariantId: json['product_variant_id'] == null
          ? null
          : _toInt(json['product_variant_id']),
    );
  }
}

class ProductFaq {
  final int id;
  final String question;
  final String answer;
  final int sortOrder;
  final bool isActive;

  ProductFaq({
    required this.id,
    required this.question,
    required this.answer,
    required this.sortOrder,
    this.isActive = true,
  });

  factory ProductFaq.fromJson(Map<String, dynamic> json) {
    return ProductFaq(
      id: _toInt(json['id']),
      question: json['question']?.toString() ?? '',
      answer: json['answer']?.toString() ?? '',
      sortOrder: _toInt(json['sort_order']),
      isActive: json['is_active'] != false,
    );
  }
}

class ProductNews {
  final int id;
  final String title;
  final String slug;
  final String content;
  final String? thumbnailUrl;
  final DateTime? publishedAt;
  final int sortOrder;
  final bool isActive;

  ProductNews({
    required this.id,
    required this.title,
    required this.slug,
    required this.content,
    this.thumbnailUrl,
    this.publishedAt,
    required this.sortOrder,
    this.isActive = true,
  });

  factory ProductNews.fromJson(Map<String, dynamic> json) {
    return ProductNews(
      id: _toInt(json['id']),
      title: json['title']?.toString() ?? '',
      slug: json['slug']?.toString() ?? '',
      content: (json['content_html'] ?? json['content'])?.toString() ?? '',
      thumbnailUrl:
          _imageFrom(json['thumbnail_url'] ?? json['image_url']).isEmpty
              ? null
              : _imageFrom(json['thumbnail_url'] ?? json['image_url']),
      publishedAt: DateTime.tryParse(json['published_at']?.toString() ?? ''),
      sortOrder: _toInt(json['sort_order']),
      isActive: json['is_active'] != false,
    );
  }
}

class ProductReview {
  final int id;
  final int rating;
  final String? comment;
  final String createdAt;
  final String? orderId;
  final int? expPerformance;
  final int? expBattery;
  final int? expCamera;
  final String? userName;
  final String? userAvatarUrl;

  ProductReview({
    required this.id,
    required this.rating,
    this.comment,
    required this.createdAt,
    this.orderId,
    this.expPerformance,
    this.expBattery,
    this.expCamera,
    this.userName,
    this.userAvatarUrl,
  });

  factory ProductReview.fromJson(Map<String, dynamic> json) {
    final user = json['user'] as Map<String, dynamic>?;
    return ProductReview(
      id: _toInt(json['id']),
      rating: _toInt(json['rating']).clamp(1, 5),
      comment: json['comment']?.toString(),
      createdAt: json['created_at']?.toString() ?? '',
      orderId: json['order_id']?.toString(),
      expPerformance: json['exp_performance'] == null
          ? null
          : _toInt(json['exp_performance']),
      expBattery:
          json['exp_battery'] == null ? null : _toInt(json['exp_battery']),
      expCamera: json['exp_camera'] == null ? null : _toInt(json['exp_camera']),
      userName: user?['name']?.toString(),
      userAvatarUrl: _imageFrom(user?['avatar_url']).isEmpty
          ? null
          : _imageFrom(user?['avatar_url']),
    );
  }
}

class ProductShopQna {
  final int id;
  final String askerDisplayName;
  final String question;
  final String? answer;
  final String? createdAt;
  final String? answeredAt;
  final String? userAvatarUrl;

  ProductShopQna({
    required this.id,
    required this.askerDisplayName,
    required this.question,
    this.answer,
    this.createdAt,
    this.answeredAt,
    this.userAvatarUrl,
  });

  factory ProductShopQna.fromJson(Map<String, dynamic> json) {
    final user = json['user'] as Map<String, dynamic>?;
    return ProductShopQna(
      id: _toInt(json['id']),
      askerDisplayName: json['asker_display_name']?.toString() ??
          user?['name']?.toString() ??
          Trans.user,
      question: json['question']?.toString() ?? '',
      answer: json['answer']?.toString(),
      createdAt: json['created_at']?.toString(),
      answeredAt: json['answered_at']?.toString(),
      userAvatarUrl: _imageFrom(user?['avatar_url']).isEmpty
          ? null
          : _imageFrom(user?['avatar_url']),
    );
  }
}

class FlashSaleItem {
  final int id;
  final double flashSalePrice;
  final FlashSale flashSale;

  FlashSaleItem({
    required this.id,
    required this.flashSalePrice,
    required this.flashSale,
  });

  factory FlashSaleItem.fromJson(Map<String, dynamic> json) {
    final saleJson = json['flash_sale'] as Map<String, dynamic>? ?? {};
    return FlashSaleItem(
      id: _toInt(json['id']),
      flashSalePrice: _toDouble(json['flash_sale_price']),
      flashSale: FlashSale.fromJson(saleJson),
    );
  }
}

class FlashSale {
  final int id;
  final DateTime endAt;

  FlashSale({required this.id, required this.endAt});

  factory FlashSale.fromJson(Map<String, dynamic> json) {
    return FlashSale(
      id: _toInt(json['id']),
      endAt:
          DateTime.tryParse(json['end_at']?.toString() ?? '') ?? DateTime.now(),
    );
  }
}

class ProductDetailScreen extends StatefulWidget {
  final String slug;
  final String? variantId;
  final double? flashSalePrice;
  final bool showFlashSale;

  const ProductDetailScreen({
    super.key,
    required this.slug,
    this.variantId,
    this.flashSalePrice,
    this.showFlashSale = false,
  });

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  Product? product;
  bool isLoading = true;
  String? error;

  final ValueNotifier<int> _currentImageIndex = ValueNotifier<int>(0);
  final PageController _pageController = PageController();
  final TextEditingController _qaQuestionController = TextEditingController();
  final TextEditingController _qaGuestNameController = TextEditingController();
  Timer? _flashSaleTimer;
  String? selectedImg;
  ProductVariant? selectedVariant;
  int quantity = 1;
  int? openFaqId;
  Set<int> _wishlistIds = {};
  Set<int> wishSet = {};
  List<Product> relatedProducts = [];
  List<ProductNews> visibleNews = [];
  List<ProductFaq> visibleFaqs = [];
  List<ProductReview> visibleReviews = [];
  List<ProductShopQna> shopQnas = [];
  String reviewFilter = 'all';
  Duration? flashTimeLeft;
  bool qaSending = false;
  String? qaFlash;
  String? qaError;

  @override
  void initState() {
    super.initState();
    _loadProduct();
    _loadWishlist();
    _loadWishlistData();
  }

  @override
  void dispose() {
    _flashSaleTimer?.cancel();
    _pageController.dispose();
    _qaQuestionController.dispose();
    _qaGuestNameController.dispose();
    super.dispose();
  }

  Future<void> _loadWishlistData() async {
    final list = await WishlistService.fetchWishlist();
    setState(() {
      _wishlistIds = list.map((item) => item['product_id'] as int).toSet();
      wishSet = Set<int>.from(_wishlistIds);
    });
  }

  Future<void> _handleToggleFavorite() async {
    final currentProduct = product; 
    if (currentProduct != null) {
      await WishlistService.toggleFavorite(currentProduct.id);
      if (mounted) setState(() {});
    }
  }

  Future<void> _loadProduct() async {
    setState(() {
      isLoading = true;
      error = null;
    });

    try {
      final productJson = await ProductsService.fetchProductBySlug(widget.slug);
      final loaded = Product.fromJson(productJson);
      if (!mounted) return;
      setState(() {
        product = loaded;
        selectedImg = loaded.mainImageUrl;
        isLoading = false;
      });
      _initializeProductState();
      _startFlashSaleTimer();
      _loadRelatedProducts();
      _loadShopQnas();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        isLoading = false;
        error = 'Không thể tải dữ liệu sản phẩm: $e';
      });
    }
  }

  void _initializeProductState() {
    final current = product;
    if (current == null) return;

    visibleFaqs = current.faqs.where((f) => f.isActive).toList()
      ..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
    visibleNews = current.news.where((n) => n.isActive).toList()
      ..sort((a, b) {
        final aTime = a.publishedAt?.millisecondsSinceEpoch ?? 0;
        final bTime = b.publishedAt?.millisecondsSinceEpoch ?? 0;
        return bTime.compareTo(aTime);
      });
    visibleReviews = current.reviews;
    openFaqId = visibleFaqs.isNotEmpty ? visibleFaqs.first.id : null;

    if (current.variants.isNotEmpty) {
      selectedVariant = current.variants.firstWhere(
        (v) => v.id.toString() == widget.variantId,
        orElse: () => current.variants.first,
      );
      if ((selectedVariant?.imageUrl ?? '').isNotEmpty) {
        selectedImg = selectedVariant!.imageUrl;
      }
    }
  }

  Future<void> _loadWishlist() async {
    final items = await WishlistService.fetchWishlist();
    if (!mounted) return;
    setState(() {
      wishSet = items.map<int>((item) => _toInt(item['product_id'])).toSet();
      _wishlistIds = Set<int>.from(wishSet);
    });
  }

  Future<void> _loadRelatedProducts() async {
    final current = product;
    if (current == null) return;

    try {
      final response = await ProductsService.fetchRelatedProducts(current.slug);
      final similar = response['similar'];
      final boughtTogether = response['bought_together'];
      final data = [
        if (similar is Map<String, dynamic> && similar['data'] is List)
          ...similar['data'] as List<dynamic>
        else if (similar is List)
          ...similar,
        if (boughtTogether is Map<String, dynamic> &&
            boughtTogether['data'] is List)
          ...boughtTogether['data'] as List<dynamic>
        else if (boughtTogether is List)
          ...boughtTogether,
      ];

      final seenIds = <int>{current.id};
      final products = data
          .whereType<Map<String, dynamic>>()
          .map(Product.fromJson)
          .where((item) => seenIds.add(item.id))
          .take(5)
          .toList();
      if (!mounted) return;
      setState(() => relatedProducts = products);
    } catch (_) {
      // Related products are optional on this screen.
    }
  }

  Future<void> _loadShopQnas() async {
    final current = product;
    if (current == null) return;

    try {
      final data = await ProductsService.fetchProductShopQnas(current.slug);
      final qnas = data
          .whereType<Map<String, dynamic>>()
          .map(ProductShopQna.fromJson)
          .toList();
      if (!mounted) return;
      setState(() => shopQnas = qnas);
    } catch (_) {
      // Q&A is optional and should not block the product page.
    }
  }

  Future<void> _submitQuestion() async {
    final current = product;
    if (current == null) return;

    final question = _qaQuestionController.text.trim();
    final guestName = _qaGuestNameController.text.trim();
    if (question.length < 5) {
      setState(() {
        qaError = 'Vui lòng nhập câu hỏi tối thiểu 5 ký tự.';
        qaFlash = null;
      });
      return;
    }

    final token = await AuthService.getToken();
    if ((token == null || token.isEmpty) && guestName.length < 2) {
      setState(() {
        qaError = 'Vui lòng nhập tên hiển thị hoặc đăng nhập.';
        qaFlash = null;
      });
      return;
    }

    setState(() {
      qaSending = true;
      qaError = null;
      qaFlash = null;
    });

    try {
      final response = await ProductsService.submitProductShopQna(
        slug: current.slug,
        question: question,
        guestName: token == null || token.isEmpty ? guestName : null,
        token: token,
      );
      _qaQuestionController.clear();
      if (token == null || token.isEmpty) _qaGuestNameController.clear();
      if (!mounted) return;
      setState(() {
        qaFlash = response['message']?.toString() ?? 'Đã gửi câu hỏi.';
        qaSending = false;
      });
      await _loadShopQnas();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        qaSending = false;
        qaError = e.toString();
      });
    }
  }

  Future<void> _toggleWishlist(int productId) async {
    final token = await AuthService.getToken();
    if (token == null || token.isEmpty) {
      if (!mounted) return;
      AppSnackBar.showError(context, Trans.loginToWishlist);
      return;
    }

    final wasLiked =
        wishSet.contains(productId) || _wishlistIds.contains(productId);
    setState(() {
      wishSet.contains(productId)
          ? wishSet.remove(productId)
          : wishSet.add(productId);
      _wishlistIds.contains(productId)
          ? _wishlistIds.remove(productId)
          : _wishlistIds.add(productId);
    });

    String? status;
    Object? toggleError;
    try {
      status = await WishlistService.toggleWishlist(productId);
    } catch (e) {
      toggleError = e;
    }
    if (!mounted) return;
    if (status == null || toggleError != null) {
      setState(() {
        if (wasLiked) {
          wishSet.add(productId);
          _wishlistIds.add(productId);
        } else {
          wishSet.remove(productId);
          _wishlistIds.remove(productId);
        }
      });
      if (toggleError != null) {
        AppSnackBar.showError(context, toggleError.toString().replaceFirst('Exception: ', ''));
        return;
      }
      AppSnackBar.showError(context, 'Không thể cập nhật yêu thích.');
    } else {
      setState(() {
        if (status == 'added') {
          wishSet.add(productId);
          _wishlistIds.add(productId);
        } else if (status == 'removed') {
          wishSet.remove(productId);
          _wishlistIds.remove(productId);
        }
      });
    }
  }

  void _startFlashSaleTimer() {
    _flashSaleTimer?.cancel();
    _updateFlashSaleTime();
    _flashSaleTimer = Timer.periodic(
      const Duration(seconds: 1),
      (_) => _updateFlashSaleTime(),
    );
  }

  void _updateFlashSaleTime() {
    final current = product;
    if (current == null || current.flashSaleItems.isEmpty) return;

    final diff =
        current.flashSaleItems.first.flashSale.endAt.difference(DateTime.now());
    if (!mounted) return;
    setState(() {
      flashTimeLeft = diff.isNegative ? null : diff;
    });
  }

  Future<void> _addToCart() async {
    final current = product;
    if (current == null) return;

    if (selectedVariant == null && current.variants.isNotEmpty) {
      AppSnackBar.showError(context, 'Vui lòng chọn đầy đủ Màu sắc & Dung lượng');
      return;
    }

    // Chỉ dùng flashSalePrice khi vào từ trang flashsale để thêm vào giỏ
    final cartPrice = (widget.showFlashSale && widget.flashSalePrice != null && widget.flashSalePrice! > 0)
        ? widget.flashSalePrice!
        : (selectedVariant?.effectivePrice ?? current.price);

    final hasSession = await AuthService.hasSession();
    if (!hasSession) {
      if (!mounted) return;
      AppDialogs.showLoginRequiredDialog(context);
      return;
    }

    try {
      await CartService.addToCart(current.id, quantity, variantId: selectedVariant?.id, price: cartPrice);

      final variantName =
          selectedVariant != null ? ' (${selectedVariant!.name})' : '';
      if (!mounted) return;
      AppSnackBar.showSuccess(context, Trans.productAddedWithQuantity(quantity, variantName));
    } catch (e) {
      if (!mounted) return;
      AppSnackBar.showError(context, 'Lỗi: ${e.toString().replaceFirst('Exception: ', '')}');
    }
  }

  double _getDisplayPrice() {
    final current = product;
    if (current == null) return 0;
    // Chỉ dùng flashSalePrice khi vào từ trang flashsale
    if (widget.showFlashSale && widget.flashSalePrice != null && widget.flashSalePrice! > 0) {
      return widget.flashSalePrice!;
    }
    if (widget.showFlashSale && current.flashSaleItems.isNotEmpty) {
      return current.flashSaleItems.first.flashSalePrice;
    }
    if (selectedVariant != null) return selectedVariant!.effectivePrice;
    return current.price;
  }

  double _getOriginalPrice() {
    final current = product;
    if (current == null) return 0;
    // Khi có flash sale price truyền vào, lấy giá gốc từ variant hoặc product
    if (selectedVariant != null) return selectedVariant!.price;
    return current.price;
  }

  List<ProductReview> _getFilteredReviews() {
    final reviews = List<ProductReview>.from(visibleReviews)
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));

    switch (reviewFilter) {
      case 'verified':
        return reviews.where((r) => r.orderId != null).toList();
      case 'with_images':
        return reviews;
      case 'star_5':
      case 'star_4':
      case 'star_3':
      case 'star_2':
      case 'star_1':
        final star = int.parse(reviewFilter.split('_').last);
        return reviews.where((r) => r.rating == star).toList();
      default:
        return reviews;
    }
  }

  Map<String, dynamic> _getReviewStats() {
    final counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
    if (visibleReviews.isEmpty) {
      return {
        'total': 0,
        'avg': 0.0,
        'counts': counts,
        'exp': {
          'performance': {'avg': 0.0, 'count': 0},
          'battery': {'avg': 0.0, 'count': 0},
          'camera': {'avg': 0.0, 'count': 0},
        },
      };
    }

    var sum = 0;
    var perfSum = 0;
    var perfCount = 0;
    var batSum = 0;
    var batCount = 0;
    var camSum = 0;
    var camCount = 0;
    for (final review in visibleReviews) {
      counts[review.rating] = (counts[review.rating] ?? 0) + 1;
      sum += review.rating;
      if (review.expPerformance != null) {
        perfSum += review.expPerformance!;
        perfCount++;
      }
      if (review.expBattery != null) {
        batSum += review.expBattery!;
        batCount++;
      }
      if (review.expCamera != null) {
        camSum += review.expCamera!;
        camCount++;
      }
    }
    return {
      'total': visibleReviews.length,
      'avg': sum / visibleReviews.length,
      'counts': counts,
      'exp': {
        'performance': {
          'avg': perfCount == 0 ? 0.0 : perfSum / perfCount,
          'count': perfCount,
        },
        'battery': {
          'avg': batCount == 0 ? 0.0 : batSum / batCount,
          'count': batCount,
        },
        'camera': {
          'avg': camCount == 0 ? 0.0 : camSum / camCount,
          'count': camCount,
        },
      },
    };
  }

  List<ProductSpecRow> _getMergedDisplaySpecs(Product current) {
    final common = current.specs
        .where((spec) => spec.productVariantId == null)
        .toList(growable: false);
    final variantSpecs = selectedVariant == null
        ? <ProductSpecRow>[]
        : current.specs
            .where((spec) => spec.productVariantId == selectedVariant!.id)
            .toList(growable: false);
    final order = <String>[];
    final byKey = <String, ProductSpecRow>{};

    void addSpec(ProductSpecRow spec) {
      final key = '${spec.specGroup ?? ''}\u0000${spec.specKey ?? ''}';
      if (!order.contains(key)) order.add(key);
      byKey[key] = spec;
    }

    for (final spec in common) {
      addSpec(spec);
    }
    for (final spec in variantSpecs) {
      addSpec(spec);
    }
    return order.map((key) => byKey[key]!).toList();
  }

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return Scaffold(
        appBar: AppBar(title: Text('Chi tiết sản phẩm')),
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final current = product;
    if (error != null || current == null) {
      return Scaffold(
        appBar: AppBar(title: Text('Chi tiết sản phẩm')),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(error ?? 'Không tìm thấy sản phẩm.'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => Navigator.pop(context),
                child: Text('Quay lại'),
              ),
            ],
          ),
        ),
      );
    }

    final reviewStats = _getReviewStats();
    final filteredReviews = _getFilteredReviews();
    final displayPrice = _getDisplayPrice();
    final hasFlashSale = widget.showFlashSale && current.flashSaleItems.isNotEmpty;
    final mergedSpecs = _getMergedDisplaySpecs(current);
    final images = current.images.isEmpty
        ? [ProductImage(id: 0, imageUrl: current.mainImageUrl)]
        : current.images;

    return Scaffold(
      appBar: AppBar(
        title: Text('Chi tiết sản phẩm'),
        elevation: 0,
      ),
      bottomNavigationBar: _buildBottomAction(displayPrice),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.only(bottom: 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildGallery(current, images),
              if (hasFlashSale && flashTimeLeft != null) _buildFlashSaleTimer(),
              _buildHeader(current, displayPrice, hasFlashSale),
              _buildVariantSelector(current),
              Divider(thickness: 8, color: Theme.of(context).colorScheme.surfaceContainerLow),
              _buildSection(
                title: Trans.productDescription,
                child: Text(
                  current.description ??
                      current.shortDescription ??
                      Trans.noDescription,
                  style: TextStyle(height: 1.5),
                ),
              ),
              Divider(thickness: 8, color: Theme.of(context).colorScheme.surfaceContainerLow),
              _buildCommitmentSection(current),
              if (mergedSpecs.isNotEmpty) ...[
                Divider(thickness: 8, color: Theme.of(context).colorScheme.surfaceContainerLow),
                _buildSection(
                  title: Trans.specifications,
                  child: _buildGroupedSpecs(mergedSpecs),
                ),
              ],
              if (visibleFaqs.isNotEmpty) ...[
                Divider(thickness: 8, color: Theme.of(context).colorScheme.surfaceContainerLow),
                _buildSection(
                  title: 'Câu hỏi thường gặp',
                  child: Column(
                    children: visibleFaqs.map(_buildFaqItem).toList(),
                  ),
                ),
              ],
              if (relatedProducts.isNotEmpty) ...[
                Divider(thickness: 8, color: Theme.of(context).colorScheme.surfaceContainerLow),
                _buildSection(
                  title: 'Sản phẩm liên quan',
                  child: SizedBox(
                    height: 270,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      itemCount: relatedProducts.length,
                      itemBuilder: (context, index) =>
                          _buildRelatedCard(relatedProducts[index]),
                    ),
                  ),
                ),
              ],
              Divider(thickness: 8, color: Theme.of(context).colorScheme.surfaceContainerLow),
              _buildRichContentAndNews(current),
              Divider(thickness: 8, color: Theme.of(context).colorScheme.surfaceContainerLow),
              _buildSection(
                title: Trans.ratingTitle(current.name),
                child: _buildVisualReviews(reviewStats, filteredReviews),
              ),
              Divider(thickness: 8, color: Theme.of(context).colorScheme.surfaceContainerLow),
              _buildSection(
                  title: 'Hỏi và đáp', child: _buildQaSection(current)),
            ],
          ),
        ),
      ),
    );
  }
Widget _buildGallery(Product current, List<ProductImage> images) {
  return Stack(
    children: [
      SizedBox(
        height: 350,
        child: PageView.builder(
          controller: _pageController,
          itemCount: images.length,
          physics: const ClampingScrollPhysics(), // Giúp phản hồi vuốt mượt và dứt khoát hơn
          onPageChanged: (index) {
            // Chỉ cập nhật index cục bộ cho bộ đếm, không Rebuild cả màn hình
            _currentImageIndex.value = index; 
            
            // Cập nhật selectedImg một cách an toàn để đồng bộ với danh sách ảnh nhỏ phía dưới
            if (selectedImg != images[index].imageUrl) {
              selectedImg = images[index].imageUrl;
            }
          },
          itemBuilder: (context, index) {
            final url = images[index].imageUrl;
            if (url.isEmpty) {
              return Center(
                child: Icon(Icons.computer, size: 88, color: Theme.of(context).colorScheme.outline),
              );
            }

            return InteractiveViewer(
              // Khóa chức năng zoom/kéo trục ngang nếu không zoom, tránh tranh chấp với PageView
              transformationController: TransformationController(),
              minScale: 1.0,
              maxScale: 2.5,
              child: Image.network(
                url,
                fit: BoxFit.contain,
                gaplessPlayback: true, // Giữ ảnh cũ, không bị nháy trắng khi lướt
                filterQuality: FilterQuality.low, // Tăng hiệu năng render khi đang lướt animation
                errorBuilder: (_, __, ___) => Center(
                  child: Icon(Icons.computer, size: 88, color: Theme.of(context).colorScheme.outline),
                ),
              ),
            );
          },
        ),
      ),
      
      // Chỉ Rebuild duy nhất cục bộ cái Text hiển thị số trang (Ví dụ: 1/4)
      if (images.length > 1)
        Positioned(
          bottom: 10,
          right: 16,
          child: ValueListenableBuilder<int>(
            valueListenable: _currentImageIndex,
            builder: (context, activeIndex, child) {
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.5),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '${activeIndex + 1}/${images.length}',
                  style: TextStyle(color: Theme.of(context).colorScheme.surface, fontSize: 12),
                ),
              );
            },
          ),
        ),

      // Nút Wishlist giữ nguyên
      Positioned(
        top: 10,
        right: 16,
        child: IconButton(
          onPressed: () => _toggleWishlist(current.id),
          icon: CircleAvatar(
            backgroundColor: Theme.of(context).colorScheme.surface.withValues(alpha: 0.85),
            child: Icon(
              wishSet.contains(current.id) ? Icons.favorite : Icons.favorite_border,
              color: wishSet.contains(current.id) ? Colors.red : Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
        ),
      ),
    ],
  );
}
  Widget _buildHeader(Product current, double displayPrice, bool hasFlashSale) {
    final oldPrice = selectedVariant?.price ?? current.price;
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if ((current.brand ?? '').isNotEmpty)
            Text(
              current.brand!.toUpperCase(),
              style: TextStyle(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
                fontWeight: FontWeight.bold,
                fontSize: 12,
              ),
            ),
          const SizedBox(height: 6),
          Text(
            current.name,
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          if (!hasFlashSale && oldPrice > displayPrice)
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '${formatCurrency(displayPrice)} đ',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFFF26522),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.only(left: 8, bottom: 2),
                  child: Text(
                    '${formatCurrency(oldPrice)} đ',
                    style: TextStyle(
                      fontSize: 14,
                      decoration: TextDecoration.lineThrough,
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                ),
              ],
            )
          else if (!hasFlashSale)
            Text(
              '${formatCurrency(displayPrice)} đ',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: Color(0xFFF26522),
              ),
            ),
          const SizedBox(height: 12),
          // Bảng tính điểm thưởng
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: const Color(0xFFFFF7ED),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFFFFEDD5)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.stars, color: Colors.amber, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: RichText(
                    text: TextSpan(
                      style: const TextStyle(fontSize: 13, color: Colors.black87, height: 1.4),
                      children: [
                        const TextSpan(text: '💡 Đặc quyền Hội viên: Mua ngay sản phẩm này và tích lũy thêm '),
                        TextSpan(
                          text: '+${(displayPrice / 100000).floor()} điểm',
                          style: const TextStyle(color: Color(0xFFEA580C), fontWeight: FontWeight.bold),
                        ),
                        TextSpan(
                          text: ' (tương đương tiết kiệm ${formatCurrency((displayPrice / 100000).floor() * 500)}đ cho các đơn sắm sửa phụ kiện lần sau).',
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }


  Widget _buildFlashSaleTimer() {
    final current = product;
    if (current == null || current.flashSaleItems.isEmpty) return const SizedBox.shrink();

    // Sử dụng hàm chuẩn của hệ thống để lấy giá bán hiện tại (giá đã giảm) và giá gốc ban đầu
    final salePrice = _getDisplayPrice();
    final oldPrice = _getOriginalPrice();

    // Tính toán phần trăm giảm giá chuẩn xác dựa trên giá thực tế đang hiển thị
    final discountPercent = oldPrice > salePrice 
        ? ((oldPrice - salePrice) / oldPrice * 100).round() 
        : 0;

    // Kiểm tra null trước khi sử dụng flashTimeLeft
    final timeLeft = flashTimeLeft;
    final hours = timeLeft != null ? (timeLeft.inHours % 24).toString().padLeft(2, '0') : '00';
    final minutes = timeLeft != null ? (timeLeft.inMinutes % 60).toString().padLeft(2, '0') : '00';
    final seconds = timeLeft != null ? (timeLeft.inSeconds % 60).toString().padLeft(2, '0') : '00';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Color(0xFFFF2453),
            Color(0xFFFF6A00),
          ],
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
        ),
      ),
      child: Stack(
        children: [
          Positioned(
            right: 120,
            top: -5,
            bottom: -5,
            child: Opacity(
              opacity: 0.15,
              child: const Icon(
                Icons.flash_on,
                size: 75,
                color: Colors.white,
              ),
            ),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.baseline,
                    textBaseline: TextBaseline.alphabetic,
                    children: [
                      // Hiển thị phần trăm giảm giá chỉ khi thực sự có giảm giá (> 0)
                      if (discountPercent > 0) ...[
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            '-$discountPercent%',
                            style: const TextStyle(
                              color: Color(0xFFFF2453),
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                      ],
                      Text(
                        '${formatCurrency(salePrice)}đ',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 20,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  // Chỉ hiện giá gốc gạch ngang nếu giá gốc lớn hơn giá khuyến mãi
                  if (oldPrice > salePrice)
                    Text(
                      '${formatCurrency(oldPrice)}đ',
                      style: const TextStyle(
                        color: Colors.white70,
                        decoration: TextDecoration.lineThrough,
                        fontSize: 13,
                      ),
                    ),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: const [
                      Icon(
                        Icons.flash_on,
                        color: Colors.white,
                        size: 18,
                      ),
                      SizedBox(width: 4),
                      Text(
                        'Flash Sale',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w900,
                          fontSize: 18,
                          fontStyle: FontStyle.italic,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text('Kết thúc sau ', style: TextStyle(color: Colors.white, fontSize: 12)),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          '$hours:$minutes:$seconds',
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }


  Widget _buildVariantSelector(Product current) {
    if (current.variants.isEmpty) return const SizedBox.shrink();

    // 1. Gom nhóm danh sách Màu Sắc duy nhất và sửa URL ảnh tượng trưng qua NetworkUtils
    final Map<String, String?> colorImages = {};
    for (var v in current.variants) {
      final cName = v.color?.trim() ?? '';
      if (cName.isNotEmpty && !colorImages.containsKey(cName)) {
        colorImages[cName] =
            v.imageUrl != null ? NetworkUtils.fixDeviceUrl(v.imageUrl!) : null;
      }
    }
    final colors = colorImages.keys.toList();

    final storages = current.variants
        .map((v) {
          String sValue = v.storage?.trim() ?? '';
          if (sValue.isEmpty) {
            sValue = v.name.trim();
            for (var color in colors) {
              if (sValue.toLowerCase().contains(color.toLowerCase())) {
                sValue =
                    sValue.replaceAll(RegExp(color, caseSensitive: false), '');
              }
            }
            final parts = sValue.trim().split(' ');
            sValue = parts.last.trim();
          }
          if (sValue.toUpperCase().endsWith('G') &&
              !sValue.toUpperCase().endsWith('GB')) {
            sValue = '${sValue}B';
          }

          return sValue.trim();
        })
        .where((s) => s.isNotEmpty)
        .toSet() 
        .toList();

    if (selectedVariant == null && current.variants.isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        setState(() {
          selectedVariant = current.variants.first; //
          if ((selectedVariant!.imageUrl ?? '').isNotEmpty) {
            selectedImg = NetworkUtils.fixDeviceUrl(selectedVariant!.imageUrl!);
          }
          quantity = 1;
        });
      });
    }

    void _updateSelectedVariant(String? newColor, String? newStorage) {
      final targetColor = newColor?.trim().toLowerCase();
      final targetStorage =
          newStorage?.trim().toLowerCase().replaceAll('gb', 'g');

      ProductVariant? match;
      try {
        match = current.variants.firstWhere(
          (v) =>
              (v.color?.trim().toLowerCase() == targetColor) &&
              ((v.storage?.trim().toLowerCase() == targetStorage) ||
                  (v.name.toLowerCase().contains(targetStorage ?? ''))),
        );
      } catch (_) {
        try {
          match = current.variants.firstWhere(
            (v) =>
                (v.color?.trim().toLowerCase() == targetColor) ||
                ((v.storage?.trim().toLowerCase() == targetStorage) ||
                    (v.name.toLowerCase().contains(targetStorage ?? ''))),
          );
        } catch (_) {
          match = current.variants.first; 
        }
      }

      setState(() {
        selectedVariant = match;
        quantity = 1;
        if (match != null && (match.imageUrl ?? '').isNotEmpty) {
          selectedImg = NetworkUtils.fixDeviceUrl(match.imageUrl!);

          final idx = current.images.indexWhere(
            (img) =>
                NetworkUtils.fixDeviceUrl(img.imageUrl).trim() ==
                selectedImg!.trim(),
          );
          if (idx != -1) {
            _pageController.jumpToPage(idx); 
          }
        }
      });
    }

    final int currentStock = selectedVariant?.stockQuantity ?? 0;
    final bool isAvailable = currentStock > 0;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ================= HÀNG 1: CHỌN MÀU SẮC =================
          if (colors.isNotEmpty) ...[
            Text(
              'Màu sắc',
              style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                  color: Theme.of(context).colorScheme.onSurface),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: colors.map((colorName) {
                final isSelected =
                    selectedVariant?.color?.trim().toLowerCase() ==
                        colorName.toLowerCase();
                final imgUrl = colorImages[colorName];

                return GestureDetector(
                  onTap: () => _updateSelectedVariant(
                      colorName, selectedVariant?.storage),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color:
                          isSelected ? const Color(0xFFFFF7ED) : Theme.of(context).colorScheme.surface,
                      border: Border.all(
                        color: isSelected
                            ? Colors.orange
                            : Theme.of(context).colorScheme.outline,
                        width: isSelected ? 0.5 : 0.5,
                      ),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (imgUrl != null && imgUrl.isNotEmpty) ...[
                          ClipRRect(
                            borderRadius: BorderRadius.circular(2),
                            child: Image.network(
                              imgUrl,
                              width: 24,
                              height: 24,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) =>
                                  const SizedBox.shrink(),
                            ),
                          ),
                          const SizedBox(width: 8),
                        ],
                        Text(
                          colorName,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: isSelected
                                ? FontWeight.w600
                                : FontWeight.normal,
                            color: isSelected
                                ? Theme.of(context).colorScheme.primary
                                : Theme.of(context).colorScheme.onSurface,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 16),
          ],

          // ================= HÀNG 2: CHỌN DUNG LƯỢNG (ĐÃ LỌC SẠCH CHỮ) =================
          if (storages.isNotEmpty) ...[
            Text(
              'Dung lượng',
              style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                  color: Theme.of(context).colorScheme.onSurface),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: storages.map((storageSize) {
                // Logic kiểm tra active thông minh, loại bỏ ký tự rườm rà
                final cleanSize =
                    storageSize.toLowerCase().replaceAll('gb', 'g');
                final isSelected = selectedVariant?.storage
                            ?.trim()
                            .toLowerCase() ==
                        cleanSize ||
                    (selectedVariant?.name.toLowerCase().contains(cleanSize) ??
                        false);

                return GestureDetector(
                  onTap: () => _updateSelectedVariant(
                      selectedVariant?.color, storageSize),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    padding:
                        const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color:
                          isSelected ? const Color(0xFFFFF7ED) : Theme.of(context).colorScheme.surface,
                      border: Border.all(
                        color: isSelected
                            ? Colors.orange
                            : Theme.of(context).colorScheme.outline,
                        width: isSelected ? 0.5 : 0.5,
                      ),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      storageSize,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight:
                            isSelected ? FontWeight.w600 : FontWeight.normal,
                        color: isSelected
                            ? Theme.of(context).colorScheme.primary
                            : Theme.of(context).colorScheme.onSurface,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 20),
          ],

          // ================= HÀNG 3: THEO DÕI SỐ LƯỢNG KHO & BỘ TĂNG GIẢM =================
          Divider(color: Theme.of(context).colorScheme.surfaceContainerLow, height: 1),
          const SizedBox(height: 16),

          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    Trans.availableQuantity,
                    style: TextStyle(fontSize: 13, color: Theme.of(context).colorScheme.onSurfaceVariant),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    isAvailable
                        ? 'Còn hàng ($currentStock sản phẩm)'
                        : Trans.outOfStock,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: isAvailable ? Colors.green[600] : Colors.red[600],
                    ),
                  ),
                ],
              ),
              if (isAvailable)
                Container(
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surface,
                    border: Border.all(color: Theme.of(context).colorScheme.outline, width: 0.5),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Row(
                    children: [
                      GestureDetector(
                        onTap: () {
                          if (quantity > 1) {
                            setState(() {
                              quantity--;
                            });
                          }
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 8),
                          color: Colors.transparent,
                          child: Text(
                            '-',
                            style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: Theme.of(context).colorScheme.onSurfaceVariant),
                          ),
                        ),
                      ),
                      Container(
                          width: 1, height: 32, color: Theme.of(context).colorScheme.outline),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        alignment: Alignment.center,
                        child: Text(
                          '$quantity',
                          style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: Theme.of(context).colorScheme.onSurface),
                        ),
                      ),
                      Container(
                          width: 1, height: 32, color: Theme.of(context).colorScheme.outline),
                      GestureDetector(
                        onTap: () {
                          if (quantity < currentStock) {
                            setState(() {
                              quantity++;
                            });
                          } else {
                            AppSnackBar.showError(context, 'Chỉ còn lại $currentStock sản phẩm trong kho!');
                          }
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 8),
                          color: Colors.transparent,
                          child: Text(
                            '+',
                            style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: Theme.of(context).colorScheme.onSurfaceVariant),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBottomAction(double displayPrice) {
    // Chỉ dùng flashSalePrice khi vào từ trang flashsale
    final finalPrice = (widget.showFlashSale && widget.flashSalePrice != null && widget.flashSalePrice! > 0)
        ? widget.flashSalePrice!
        : (selectedVariant?.effectivePrice ?? displayPrice);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        boxShadow: [
          BoxShadow(
              color: Colors.black12, blurRadius: 10, offset: Offset(0, -5)),
        ],
      ),
      child: SafeArea(
        child: Row(
          children: [
            Expanded(
              flex: 4, 
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${formatCurrency(finalPrice)} đ x $quantity',
                    style: TextStyle(
                      fontSize: 12,
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Tổng cộng',
                    style: TextStyle(fontSize: 11, color: Theme.of(context).colorScheme.onSurfaceVariant),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${formatCurrency(finalPrice * quantity)} đ',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Colors.red,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),

            ElevatedButton.icon(
              onPressed: () async {
                await _addToCart();
              },
              icon: const Icon(Icons.add_shopping_cart, color: Colors.white),
              label: Text(Trans.addToCart),
              style: ElevatedButton.styleFrom(
                backgroundColor:  Color(0xFFFF6A00), // Đổi thành màu cam tại đây
                foregroundColor: Colors.white,  // Đổi chữ và icon thành màu trắng cho nổi bật
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSection({required String title, required Widget child}) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style:
                  TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }

  Widget _buildCommitmentSection(Product current) {
    final hay = '${current.categorySlug ?? ''} ${current.categoryName ?? ''}'
        .toLowerCase();
    final setupText = hay.contains('laptop') ||
            hay.contains('pc') ||
            hay.contains('macbook')
        ? 'Hỗ trợ cài đặt hệ điều hành/driver cơ bản và test máy trước khi giao.'
        : hay.contains('linh kiện') ||
                hay.contains('cpu') ||
                hay.contains('vga') ||
                hay.contains('mainboard')
            ? 'Hỗ trợ tư vấn tương thích linh kiện trước khi mua.'
            : 'Hỗ trợ cài đặt ban đầu, kiểm tra ngoại quan và chức năng trước khi giao.';
    final items = [
      (Icons.verified_outlined, 'Hàng mới, chính hãng, serial rõ ràng.'),
      (
        Icons.shield_outlined,
        'Bảo hành 12 tháng theo chính sách hãng/nhà phân phối.'
      ),
      (Icons.memory_outlined, setupText),
      (Icons.sell_outlined, Trans.vatIncluded),
    ];

    return _buildSection(
      title: 'Cam kết sản phẩm',
      child: Column(
        children: items.map((item) {
          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Color(0xFFFFF7ED),
              border: Border.all(color: Colors.orange, width: 0.5),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(item.$1, color: Color(0xFF1D3557), size: 22),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(item.$2, style: TextStyle(height: 1.35)),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildGroupedSpecs(List<ProductSpecRow> specs) {
    final grouped = <String, List<ProductSpecRow>>{};
    for (final spec in specs) {
      final group = (spec.specGroup ?? '').trim().isEmpty
          ? 'Thông tin khác'
          : spec.specGroup!.trim();
      grouped.putIfAbsent(group, () => []).add(spec);
    }

    return Column(
      children: grouped.entries.map((entry) {
        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            border: Border.all(color: Theme.of(context).colorScheme.outline, width: 0.15),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                flex: 2,
                child: Text(
                  entry.key,
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).colorScheme.onSurface,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 3,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: entry.value.map((spec) {
                    final unit = (spec.specUnit ?? '').trim();
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: RichText(
                        text: TextSpan(
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.onSurface,
                            height: 1.35,
                          ),
                          children: [
                            TextSpan(
                              text: '${spec.specKey ?? ''}: ',
                              style:
                                  TextStyle(fontWeight: FontWeight.bold),
                            ),
                            TextSpan(
                              text:
                                  '${spec.specValue ?? ''}${unit.isEmpty ? '' : ' $unit'}',
                            ),
                          ],
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildFaqItem(ProductFaq faq) {
    final isOpen = openFaqId == faq.id;
    return Column(
      children: [
        ListTile(
          contentPadding: EdgeInsets.zero,
          title: Text(
            faq.question,
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
          ),
          // Thay đổi phần Icon tại đây thành hình tam giác đặc
          trailing: Icon(
            isOpen ? Icons.arrow_drop_up : Icons.arrow_drop_down, 
            size: 26, // Kích thước được tăng lên một chút để rõ ràng như ảnh mẫu
            color: Theme.of(context).colorScheme.onSurface
          ),
          onTap: () => setState(() => openFaqId = isOpen ? null : faq.id),
        ),
        if (isOpen)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Text(
              faq.answer, 
              style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant, height: 1.4),
            ),
          ),
        Divider( color: Theme.of(context).colorScheme.outline, height: 1),
        const SizedBox(height: 10),
      ],
    );
  }

  Widget _buildRichContentAndNews(Product current) {
    final rich = (current.richHtml ?? '').trim();
    final hasRich = rich.isNotEmpty;
    final hasNews = visibleNews.isNotEmpty;

    if (!hasRich && !hasNews) {
      return _buildSection(
        title: 'Nội dung chi tiết',
        child: Text(
          'Chưa có nội dung chi tiết.',
          style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
        ),
      );
    }

    return _buildSection(
      title: 'Nội dung chi tiết',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (hasRich)
            Container(
              width: double.infinity,
              // padding: const EdgeInsets.all(14),
              // decoration: BoxDecoration(
              //   color: Theme.of(context).colorScheme.surface,
              //   border: Border.all(color: Theme.of(context).colorScheme.outline),
              //   borderRadius: BorderRadius.circular(12),
              // ),
              // Thay thế widget Text cũ bằng widget Html
              child: Html(
                data: rich ?? 'Không có mô tả cho sản phẩm này.',
                style: {
                  // Cấu hình định dạng chung cho toàn bộ văn bản
                  "body": Style(
                    margin: Margins.zero,
                    padding: HtmlPaddings.zero,
                    fontSize: FontSize(14),
                    lineHeight: const LineHeight(1.55),
                    color: Theme.of(context).colorScheme.onSurface,
                  ),
                  // Cấu hình riêng cho bảng biểu (table) nếu nội dung từ admin có chứa bảng
                  "table": Style(
                    backgroundColor: Theme.of(context).colorScheme.surfaceContainerLow,
                    border: Border.all(color: Theme.of(context).colorScheme.outline),
                  ),
                  "th": Style(
                    padding: HtmlPaddings.all(6),
                    backgroundColor: Theme.of(context).colorScheme.surfaceContainerLow,
                  ),
                  "td": Style(
                    padding: HtmlPaddings.all(6),
                    border: Border.all(color: Theme.of(context).colorScheme.outline),
                  ),
                },
              ),
            ),
          if (hasNews) ...[
            const SizedBox(height: 18),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Tin tức sản phẩm',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                Text(
                  'XEM TẤT CẢ ',
                  style: TextStyle(
                      color: const Color(0xFFFF2424), fontWeight: FontWeight.w600),
                ),
              ],
            ),
            const SizedBox(height: 10),
            ...visibleNews.take(7).map(_buildNewsMiniCard),
          ],
        ],
      ),
    );
  }

// 1. ĐỊNH VỊ HÀM NÀY NẰM ĐỘC LẬP TRONG CLASS _ProductDetailScreenState
  String _resolveImageUrl(String? url) {
    return NetworkUtils.fixDeviceUrl(url);
  }

  // 2. HÀM MINI CARD TIN TỨC GỌI ĐẾN PHƯƠNG THỨC TRÊN
  Widget _buildNewsMiniCard(ProductNews item) {
    return InkWell(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => ProductNewDetailScreen(slug: item.slug),
          ),
        );
      },
      borderRadius: BorderRadius.circular(12),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surfaceContainerLow,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Theme.of(context).colorScheme.outline, width: 0.15),
        ),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: Container(
                width: 70,
                height: 70,
                color: Theme.of(context).colorScheme.outline,
                child: item.thumbnailUrl == null || item.thumbnailUrl!.isEmpty
                    ? Icon(Icons.article_outlined, color: Theme.of(context).colorScheme.onSurfaceVariant)
                    : Image.network(
                        _resolveImageUrl(
                            item.thumbnailUrl), // Gọi hàm sạch lỗi hoàn toàn
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Icon(
                          Icons.article_outlined, color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                      ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                item.title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 13.5,
                  color: Theme.of(context).colorScheme.onSurface,
                  height: 1.3,
                ),
              ),
            ),
            const SizedBox(width: 4),
            Icon(Icons.chevron_right, color: Theme.of(context).colorScheme.onSurfaceVariant, size: 18),
          ],
        ),
      ),
    );
  }

  void _showWriteReviewSheet() {
    final current = product;
    if (current == null) return;

    // 1. TRẠNG THÁI LƯU TRỮ CHỌN SAO (Mặc định chọn 5 sao)
    int localRating = 5; // Đánh giá chung
    int localPerformance = 5; // Hiệu năng
    int localBattery = 5; // Thời lượng pin
    int localCamera = 5; // Chất lượng camera

    final TextEditingController localReviewController = TextEditingController();
    bool localIsSubmitting = false;

    // Danh sách nhãn cho phần Đánh giá chung
    final List<String> generalLabels = [
      'Rất tệ',
      'Tệ',
      'Bình thường',
      'Tốt',
      'Tuyệt vời'
    ];

    // 2. LOGIC ĐỔI TEXT ĐỘNG CHO TỪNG TIÊU CHÍ TRẢI NGHIỆM (CHUẨN THEO WEB)
    String _getPerformanceLabel(int score) {
      if (score >= 5) return 'Siêu mạnh mẽ';
      if (score == 4) return 'Mượt mà';
      if (score == 3) return 'Ổn định';
      if (score == 2) return 'Hơi lag';
      return 'Rất chậm';
    }

    String _getBatteryLabel(int score) {
      if (score >= 5) return 'Cực khủng';
      if (score == 4) return 'Trâu bâu';
      if (score == 3) return 'Đủ dùng';
      if (score == 2) return 'Yếu';
      return 'Hao pin nhanh';
    }

    String _getCameraLabel(int score) {
      if (score >= 5) return 'Xất sắc';
      if (score == 4) return 'Sắc nét';
      if (score == 3) return 'Cơ bản';
      if (score == 2) return 'Góc mờ';
      return 'Rất tệ';
    }

    Widget _buildExperienceRow(String label, int currentValue,
        String dynamicLabel, Function(int) onStarTap) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          crossAxisAlignment:
              CrossAxisAlignment.center, // SỬA THÀNH ĐOẠN NÀY ĐỂ HẾT LỖI
          children: [
            // 1. Tên tiêu chí bên trái (Cố định độ rộng vừa phải)
            SizedBox(
              width: 105,
              child: Text(
                label,
                style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: Theme.of(context).colorScheme.onSurfaceVariant),
              ),
            ),

            // 2. Bọc khối sao vào Expanded để tự động tính toán không gian và chống tràn viền
            Expanded(
              child: Align(
                alignment: Alignment.centerLeft,
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: List.generate(5, (index) {
                      final starValue = index + 1;
                      return GestureDetector(
                        onTap: () => onStarTap(starValue),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 1.5),
                          child: Icon(
                            Icons.star,
                            size: 19,
                            color: starValue <= currentValue
                                ? Colors.orange
                                : Theme.of(context).colorScheme.outline,
                          ),
                        ),
                      );
                    }),
                  ),
                ),
              ),
            ),

            const SizedBox(width: 4),

            // 3. Chữ trạng thái động bên phải ngoài cùng (Ví dụ: "Chụp đẹp, chuyên nghiệp")
            Text(
              dynamicLabel,
              style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).colorScheme.onSurface),
            ),
          ],
        ),
      );
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (BuildContext context) {
        return StatefulBuilder(
          builder: (BuildContext context, StateSetter setModalState) {
            return AnimatedPadding(
              padding: MediaQuery.of(context).viewInsets,
              duration: const Duration(milliseconds: 100),
              child: Container(
                width: double.infinity,
                constraints: BoxConstraints(
                  maxHeight: MediaQuery.of(context).size.height * 0.85,
                ),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surface,
                  borderRadius: BorderRadius.only(
                    topLeft: Radius.circular(16),
                    topRight: Radius.circular(16),
                  ),
                ),
                padding: const EdgeInsets.all(20),
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Thanh gờ kéo trên đầu sheet
                      Center(
                        child: Container(
                          width: 40,
                          height: 4,
                          margin: const EdgeInsets.only(bottom: 16),
                          decoration: BoxDecoration(
                            color: Theme.of(context).colorScheme.outline,
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                      ),

                      // ================= KHỐI 1: ĐÁNH GIÁ CHUNG =================
                      Text(
                        Trans.overallRating,
                        style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: Theme.of(context).colorScheme.onSurface),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: List.generate(5, (index) {
                          final starValue = index + 1;
                          return GestureDetector(
                            onTap: () =>
                                setModalState(() => localRating = starValue),
                            child: Column(
                              children: [
                                Icon(
                                  Icons.star,
                                  size: 28,
                                  color: starValue <= localRating
                                      ? Colors.orange
                                      : Theme.of(context).colorScheme.outline,
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  generalLabels[index],
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: starValue == localRating
                                        ? Colors.orange
                                        : Theme.of(context).colorScheme.onSurfaceVariant,
                                    fontWeight: starValue == localRating
                                        ? FontWeight.bold
                                        : FontWeight.normal,
                                  ),
                                ),
                              ],
                            ),
                          );
                        }),
                      ),
                      const SizedBox(height: 16),
                      Divider(color: Theme.of(context).colorScheme.surfaceContainerLow, thickness: 1),

                      // ================= KHỐI 2: THEO TRẢI NGHIỆM =================
                      const SizedBox(height: 8),
                      Text(
                        'Theo trải nghiệm',
                        style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: Theme.of(context).colorScheme.onSurface),
                      ),
                      const SizedBox(height: 12),
                      _buildExperienceRow(
                          'Hiệu năng',
                          localPerformance,
                          _getPerformanceLabel(localPerformance),
                          (val) => setModalState(() => localPerformance = val)),
                      _buildExperienceRow(
                          'Thời lượng pin',
                          localBattery,
                          _getBatteryLabel(localBattery),
                          (val) => setModalState(() => localBattery = val)),
                      _buildExperienceRow(
                          'Chất lượng camera',
                          localCamera,
                          _getCameraLabel(localCamera),
                          (val) => setModalState(() => localCamera = val)),
                      const SizedBox(height: 16),
                      Divider(color: Theme.of(context).colorScheme.surfaceContainerLow, thickness: 1),

                      // ================= KHỐI 3: NHẬP NỘI DUNG ĐÁNH GIÁ =================
                      const SizedBox(height: 8),
                      TextField(
                        controller: localReviewController,
                        maxLines: 5,
                        style: TextStyle(
                            fontSize: 13, color: Theme.of(context).colorScheme.onSurface),
                        decoration: InputDecoration(
                          hintText:
                              'Xin mời chia sẻ một số cảm nhận về sản phẩm (nhập tối thiểu 15 kí tự)',
                          hintStyle:
                              TextStyle(fontSize: 13, color: Theme.of(context).colorScheme.onSurfaceVariant),
                          filled: true,
                          fillColor: Theme.of(context).colorScheme.surface,
                          contentPadding: const EdgeInsets.all(14),
                          enabledBorder: OutlineInputBorder(
                            borderSide: const BorderSide(
                                color: Color(0xFFD1D5DB), width: 1.0),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderSide: BorderSide(
                                color: Theme.of(context).colorScheme.primary, width: 1.5),
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),

                      // NÚT BẤM GỬI ĐÁNH GIÁ
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: localIsSubmitting
                              ? null
                              : () async {
                                  final commentText =
                                      localReviewController.text.trim();
                                  if (commentText.length < 15) {
                                    AppSnackBar.showError(context, Trans.reviewContentMinLength);
                                    return;
                                  }

                                  final token = await AuthService.getToken();
                                  if (!context.mounted) return;
                                  if (token == null || token.isEmpty) {
                                    Navigator.pop(context); // Close modal
                                    Navigator.push(context, MaterialPageRoute(builder: (_) => const LoginScreen()));
                                    AppSnackBar.showError(context, Trans.loginToWriteReview);
                                    return;
                                  }

                                  setModalState(() {
                                    localIsSubmitting = true;
                                  });

                                  // Giả lập đẩy dữ liệu Object gồm 4 tham số điểm số lên Backend của bạn
                                  try {
                                    await ReviewsService.submitProductReview(
                                      productId: current.id,
                                      token: token,
                                      rating: localRating,
                                      comment: commentText,
                                      expPerformance: localPerformance,
                                      expBattery: localBattery,
                                      expCamera: localCamera,
                                    );
                                  } catch (e) {
                                    setModalState(() {
                                      localIsSubmitting = false;
                                    });
                                    if (context.mounted) {
                                      AppSnackBar.showError(context, e.toString().replaceFirst('Exception: ', ''));
                                    }
                                    return;
                                  }

                                  if (context.mounted) {
                                    Navigator.pop(context);
                                    AppSnackBar.showSuccess(context, Trans.reviewSubmittedSuccess);
                                    _loadProduct();
                                  }
                                },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.orange,
                            disabledBackgroundColor: Theme.of(context).colorScheme.outline,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12)),
                            elevation: 0,
                          ),
                          child: localIsSubmitting
                              ? SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                      strokeWidth: 2, color: Theme.of(context).colorScheme.surface),
                                )
                              : Text(
                                  Trans.submitReviewButton,
                                  style: TextStyle(
                                      color: Theme.of(context).colorScheme.surface,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14),
                                ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildVisualReviews(
      Map<String, dynamic> stats, List<ProductReview> filtered) {
    final avg = stats['avg'] as double;
    final total = stats['total'] as int;
    final counts = stats['counts'] as Map<int, int>;
    final exp = stats['exp'] as Map<String, dynamic>;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFFFFFBEB),
            border: Border.all(color: const Color(0xFFFDE68A)),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            children: [
              Row(
                children: [
                  Expanded(
                    flex: 2,
                    child: Column(
                      children: [
                        Text(
                          avg.toStringAsFixed(1),
                          style: TextStyle(
                            fontSize: 40,
                            fontWeight: FontWeight.bold, color: Colors.black
                          ),
                        ),
                        Text('/ 5', style: TextStyle(color: Theme.of(context).colorScheme.surface)),
                        const SizedBox(height: 4),
                        _buildStars(avg, size: 17),
                        const SizedBox(height: 8),
                        Text(Trans.totalReviews(total),
                            style: TextStyle(fontSize: 12, color: Colors.black)),
                        const SizedBox(height: 10),
                        // TÌM ĐOẠN NÚT BẤM CŨ TRONG _buildVisualReviews VÀ THAY BẰNG ĐOẠN NÀY:
                        OutlinedButton(
                          onPressed:
                              _showWriteReviewSheet, // KÍCH HOẠT HÀM BẬT BOTTOM SHEET NỔI TỪ DƯỚI LÊN
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.orange,
                            side: BorderSide(
                                color: Colors.orange, width: 1.5),
                            foregroundColor: Theme.of(context).colorScheme.surface,
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 8),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(
                                  4), // Định dạng khối vuông bo góc nhẹ đồng bộ Web
                            ),
                          ),
                          child: FittedBox(
                            fit: BoxFit.scaleDown,
                            child: Text(
                              Trans.writeReview,
                              style: const TextStyle(
                                  fontSize: 12, fontWeight: FontWeight.bold, color: Colors.black),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 18),
                  Expanded(
                    flex: 3,
                    child: Column(
                      children: [5, 4, 3, 2, 1].map((star) {
                        final count = counts[star] ?? 0;
                        final percent = total > 0 ? count / total : 0.0;
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 6),
                          child: Row(
                            children: [
                              Text('$star',
                                  style: TextStyle(fontSize: 11, color: Colors.black)),
                              const SizedBox(width: 3),
                              const Icon(Icons.star,
                                  color: Colors.orange, size: 12),
                              const SizedBox(width: 5),
                              Expanded(
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(2),
                                  child: LinearProgressIndicator(
                                    value: percent,
                                    minHeight: 7,
                                    backgroundColor: Theme.of(context).colorScheme.surface,
                                    valueColor: const AlwaysStoppedAnimation(
                                        Colors.orange),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 6),
                              Text('$count',
                                  style: TextStyle(fontSize: 11, color: Colors.black)),
                            ],
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              _buildExperienceStats(exp),
            ],
          ),
        ),
        const SizedBox(height: 18),
        Text(
          Trans.filterReviewsBy,
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            _buildReviewFilterChip('all', 'Tất cả'),
            _buildReviewFilterChip('verified', 'Đã mua hàng'),
            _buildReviewFilterChip('star_5', '5 sao'),
            _buildReviewFilterChip('star_4', '4 sao'),
            _buildReviewFilterChip('star_3', '3 sao'),
            _buildReviewFilterChip('star_2', '2 sao'),
            _buildReviewFilterChip('star_1', '1 sao'),
          ],
        ),
        const SizedBox(height: 20),
        if (filtered.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surfaceContainerLow,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(Trans.noReviewsYet,
                style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)),
          )
        else
          ...filtered.take(5).map(_buildReviewItem),
      ],
    );
  }

  Widget _buildExperienceStats(Map<String, dynamic> exp) {
    return Column(
      children: [
        _buildExperienceStatRow('Hiệu năng', exp['performance']),
        _buildExperienceStatRow('Thời lượng pin', exp['battery']),
        _buildExperienceStatRow('Chất lượng camera', exp['camera']),
      ],
    );
  }

  Widget _buildExperienceStatRow(String label, dynamic raw) {
    final data = raw as Map<String, dynamic>;
    final avg = data['avg'] as double;
    final count = data['count'] as int;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          SizedBox(
            width: 108,
            child: Text(label, style: TextStyle(fontSize: 12, color: Colors.black)),
          ),
          Expanded(child: _buildStars(avg, size: 14)),
          Text(
            '${count == 0 ? 0 : avg.toStringAsFixed(0)}/5',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.black),
          ),
          Text(' ($count)',
              style: TextStyle(fontSize: 11, color: Colors.black)),
        ],
      ),
    );
  }

  Widget _buildReviewFilterChip(String value, String label) {
    final selected = reviewFilter == value;
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => setState(() => reviewFilter = value),
      selectedColor: const Color(0xFFFFEDD5),
      side: BorderSide(
        color: selected ? Colors.orange : Theme.of(context).colorScheme.outline,width: 0.15
      ),
      labelStyle: TextStyle(
        color: selected ? Colors.orange : Theme.of(context).colorScheme.onSurface,
        fontWeight: FontWeight.w600,
      ),
    );
  }

  Widget _buildStars(num value, {double size = 16}) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(
        5,
        (i) => Icon(
          Icons.star,
          color: i < value.round() ? Colors.orange : Theme.of(context).colorScheme.outline,
          size: size,
        ),
      ),
    );
  }

  String _avatarInitial(String name) {
    final trimmed = name.trim();
    if (trimmed.isEmpty) return 'U';
    return String.fromCharCode(trimmed.runes.first).toUpperCase();
  }

  Widget _buildReviewPill(String text, {bool verified = false}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: verified ? const Color(0xFFDCFCE7) : const Color(0xFFEFF6FF),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: verified ? const Color(0xFF15803D) : const Color(0xFF1D4ED8),
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _buildReviewItem(ProductReview review) {
    final userName = review.userName ?? 'Người dùng';
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        border: Border.all(color: Theme.of(context).colorScheme.outline, width: 0.15),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Column(
            children: [
              CircleAvatar(
                radius: 22,
                backgroundColor: Theme.of(context).colorScheme.primary,
                backgroundImage: review.userAvatarUrl == null
                    ? null
                    : NetworkImage(review.userAvatarUrl!),
                child: review.userAvatarUrl == null
                    ? Text(
                        _avatarInitial(userName),
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.surface,
                          fontWeight: FontWeight.bold,
                        ),
                      )
                    : null,
              ),
              const SizedBox(height: 6),
              SizedBox(
                width: 58,
                child: Text(
                  userName,
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                      fontSize: 11, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    _buildStars(review.rating, size: 15),
                    const SizedBox(width: 8),
                    Text(
                      _ratingLabel(review.rating),
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    if (review.expPerformance != null)
                      _buildReviewPill(
                        'Hiệu năng ${review.expPerformance! >= 5 ? 'Siêu mạnh mẽ' : _ratingLabel(review.expPerformance!)}',
                      ),
                    if (review.expBattery != null)
                      _buildReviewPill(
                        'Thời lượng pin ${review.expBattery! >= 5 ? 'Cực khủng' : _ratingLabel(review.expBattery!)}',
                      ),
                    if (review.expCamera != null)
                      _buildReviewPill(
                        'Camera ${review.expCamera! >= 5 ? 'Chụp đẹp' : _ratingLabel(review.expCamera!)}',
                      ),
                    if (review.orderId != null)
                      _buildReviewPill('Đã mua hàng', verified: true),
                  ],
                ),
                if ((review.comment ?? '').isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Text(review.comment!, style: TextStyle(height: 1.4)),
                ],
                if (review.createdAt.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    Trans.reviewPostedAt(_timeAgoVi(review.createdAt)),
                    style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant, fontSize: 12),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQaSection(Product current) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            border: Border.all(color: Theme.of(context).colorScheme.outline, width: 0.15),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // KHỐI TIÊU ĐỀ & MASCOT CHĂM SÓC KHÁCH HÀNG
              Row(
                children: [
                  Image.asset(
                    'assets/images/mascot.png',
                    width: 54,
                    height: 54,
                    errorBuilder: (_, __, ___) => CircleAvatar(
                      backgroundColor: Theme.of(context).colorScheme.tertiaryContainer,
                      child: Icon(Icons.support_agent, color: Theme.of(context).colorScheme.primary),

                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Hãy đặt câu hỏi cho chúng tôi',
                          style: TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Đội ngũ E-Tech Market sẽ phản hồi trong thời gian sớm nhất.',
                          style:
                              TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // KHỐI CHECK TRẠNG THÁI ĐĂNG NHẬP / NHẬP TÊN GUEST
              FutureBuilder<String?>(
                future: AuthService.getToken(),
                builder: (context, snapshot) {
                  final isLoggedIn = (snapshot.data ?? '').isNotEmpty;
                  if (isLoggedIn) {
                    return Padding(
                      padding: EdgeInsets.only(bottom: 10),
                      child: Text(
                        'Bạn đang đăng nhập, câu hỏi sẽ hiển thị kèm tên tài khoản.',
                        style:
                            TextStyle(color: Color(0xFF16A34A), fontSize: 12),
                      ),
                    );
                  }
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: TextField(
                      controller: _qaGuestNameController,
                      style: TextStyle(fontSize: 13),
                      decoration: InputDecoration(
                        labelText: 'Tên hiển thị',
                        labelStyle: TextStyle(fontSize: 13),
                        filled: true,
                        fillColor: Theme.of(context).colorScheme.surface,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide:
                              const BorderSide(color: Color(0xFFCBD5E1)),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide:
                              const BorderSide(color: Color(0xFFE2E8F0)),
                        ),
                        isDense: true,
                      ),
                    ),
                  );
                },
              ),

              // ================= KHỐI SỬA ĐỔI: Ô NHẬP LIỆU LỒNG NÚT GỬI (GẮN STACK) =================
              Stack(
                alignment: Alignment
                    .bottomRight, // Định vị vị trí nút nằm ở góc dưới cùng bên phải
                children: [
                  TextField(
                    controller: _qaQuestionController,
                    minLines:
                        4, // Tăng độ cao ô nhập lên để tạo không gian trống phía dưới cho nút
                    maxLines: 6,
                    maxLength: 2000,
                    style:
                        TextStyle(fontSize: 13, color: Theme.of(context).colorScheme.onSurface),
                    decoration: InputDecoration(
                      hintText: 'Xin mời nhập câu hỏi của bạn tại đây...',
                      hintStyle:
                          TextStyle(fontSize: 13, color: Theme.of(context).colorScheme.onSurfaceVariant),
                      filled: true,
                      fillColor: Theme.of(context).colorScheme.surface,
                      counterText:
                          '', // Ẩn bộ đếm mặc định của chân viền để làm trống góc phải
                      contentPadding: const EdgeInsets.only(
                        left: 14,
                        right: 14,
                        top: 14,
                        bottom:
                            54, // Tạo khoảng trống lề dưới lớn (padding-bottom) để chữ không bị nút đè lên
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(
                            color: Color(0xFFCBD5E1), width: 1.0),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(
                            color: Theme.of(context).colorScheme.primary, width: 1.2),
                      ),
                    ),
                  ),

                  // ĐỊNH VỊ NÚT GỬI NẰM LỌT VÀO TRONG KHU VỰC TEXTFIELD
                  Padding(
                    padding: const EdgeInsets.all(
                        10), // Khoảng cách lề so với góc viền Textfield
                    child: ElevatedButton(
                      onPressed: qaSending ? null : _submitQuestion,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.orange,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 10),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(
                              6), // Bo góc vuông nhẹ đồng bộ CSS Web
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            qaSending ? 'ĐANG GỬI...' : 'GỬI CÂU HỎI',
                            style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 0.5),
                          ),
                          const SizedBox(width: 6),
                          if (qaSending)
                            SizedBox(
                              width: 12,
                              height: 12,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: Theme.of(context).colorScheme.surface),
                            )
                          else
                            const Icon(Icons.send, size: 13, color: Colors.white),
                        ],
                      ),
                    ),
                  ),
                ],
              ),

              // THÔNG BÁO LỖI HOẶC FLASH THÀNH CÔNG (NẾU CÓ)
              if (qaError != null) ...[
                const SizedBox(height: 8),
                Text(qaError!,
                    style: TextStyle(color: Colors.red, fontSize: 12)),
              ],
              if (qaFlash != null && qaError == null) ...[
                const SizedBox(height: 8),
                Text(qaFlash!,
                    style: TextStyle(
                        color: Color(0xFF16A34A), fontSize: 12)),
              ],
            ],
          ),
        ),
        const SizedBox(height: 18),

        // DANH SÁCH CÁC CÂU HỎI ĐÃ ĐƯỢC ĐĂNG
        if (shopQnas.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surfaceContainerLow,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              'Chưa có câu hỏi nào. Hãy đặt câu hỏi đầu tiên ở ô phía trên.',
              style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant, fontSize: 13),
            ),
          )
        else
          ...shopQnas.map(_buildQnaThreadItem),
      ],
    );
  }

  Widget _buildQnaThreadItem(ProductShopQna row) {
    final hasAnswer = (row.answer ?? '').trim().isNotEmpty;
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        border: Border.all(color: Theme.of(context).colorScheme.outline, width:0.15),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                radius: 20,
                backgroundColor: const Color(0xFFE0F2FE),
                backgroundImage: row.userAvatarUrl == null
                    ? null
                    : NetworkImage(row.userAvatarUrl!),
                child: row.userAvatarUrl == null
                    ? Text(
                        _avatarInitial(row.askerDisplayName),
                        style: TextStyle(
                          color: Color(0xFF0369A1),
                          fontWeight: FontWeight.bold,
                        ),
                      )
                    : null,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            row.askerDisplayName,
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ),
                        if ((row.createdAt ?? '').isNotEmpty)
                          Text(
                            _timeAgoVi(row.createdAt!),
                            style: TextStyle(
                                color: Theme.of(context).colorScheme.onSurfaceVariant, fontSize: 12),
                          ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(row.question, style: TextStyle(height: 1.4)),
                    const SizedBox(height: 8),
                    if (!hasAnswer)
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFF7ED),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          'Đang chờ cửa hàng',
                          style: TextStyle(
                            color: Color(0xFFC2410C),
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
          if (hasAnswer) ...[
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF1DE),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CircleAvatar(
                    radius: 18,
                    backgroundColor: Colors.orange,
                    child: Text(
                      'QT',
                      style: TextStyle(
                          color: Theme.of(context).colorScheme.surface, fontWeight: FontWeight.bold),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              'Quản trị viên',
                              style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black),
                            ),
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFFDCFCE7),
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: Text(
                                'QTV',
                                style: TextStyle(
                                  color: Color(0xFF15803D),
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(row.answer!, style: TextStyle(height: 1.45, color: Colors.black)),
                        if ((row.answeredAt ?? '').isNotEmpty) ...[
                          const SizedBox(height: 6),
                          Text(
                            _timeAgoVi(row.answeredAt!),
                            style: TextStyle(
                                color: Colors.black45, fontSize: 12),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildRelatedCard(Product p) {
    final bool isLiked = _wishlistIds.contains(p.id);

    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
              builder: (context) => ProductDetailScreen(slug: p.slug)),
        );
      },
      child: Container(
        width: 160,
        margin: const EdgeInsets.only(right: 12),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Theme.of(context).colorScheme.outline, width: 0.15),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                ClipRRect(
                  borderRadius:
                      const BorderRadius.vertical(top: Radius.circular(12)),
                  child: SizedBox(
                    height: 160,
                    width: 160,
                    child: p.mainImageUrl.isEmpty
                        ? Icon(Icons.computer,
                            size: 50, color: Theme.of(context).colorScheme.outline)
                        : Image.network(
                            NetworkUtils.fixDeviceUrl(p.mainImageUrl),
                            fit: BoxFit.cover,
                          ),
                  ),
                ),
                Positioned(
                  top: 8,
                  right: 8,
                  child: InkWell(
                    onTap: () async {
                      await _toggleWishlist(p.id);
                    },
                    child: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.surface.withOpacity(0.9),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        isLiked ? Icons.favorite : Icons.favorite_border,
                        size: 18,
                        color: isLiked ? Colors.red : Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    p.name,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: Theme.of(context).colorScheme.onSurface,
                      height: 1.3,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    p.shortDescription ??
                        p.description ??
                        'Sản phẩm công nghệ cao cấp',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 11,
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                      height: 1.4,
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

  Widget _buildCompactTimeUnit(int value) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        value.toString().padLeft(2, '0'),
        style: TextStyle(
          color: Colors.red,
          fontWeight: FontWeight.bold,
          fontSize: 12,
        ),
      ),
    );
  }
}
