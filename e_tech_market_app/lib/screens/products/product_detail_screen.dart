import 'package:flutter/material.dart';

// Currency formatter helper
String formatCurrency(double value) {
  final formatter = value.toInt();
  return formatter.toString().replaceAllMapped(
    RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
    (match) => '${match[1]},',
  );
}

// Models (assuming these exist in your models)
// If not, you'll need to create them
class Product {
  final int id;
  final String name;
  final String slug;
  final String? shortDescription;
  final String? description;
  final String mainImageUrl;
  final List<ProductImage> images;
  final List<ProductVideo>? videos;
  final double price;
  final String? sku;
  final int stockQuantity;
  final String? brand;
  final int categoryId;
  final List<ProductVariant> variants;
  final List<ProductSpecRow> specs;
  final List<ProductFaq>? faqs;
  final List<ProductNews>? news;
  final List<ProductReview>? reviews;
  final List<FlashSaleItem>? flashSaleItems;

  Product({
    required this.id,
    required this.name,
    required this.slug,
    this.shortDescription,
    this.description,
    required this.mainImageUrl,
    required this.images,
    this.videos,
    required this.price,
    this.sku,
    required this.stockQuantity,
    this.brand,
    required this.categoryId,
    required this.variants,
    required this.specs,
    this.faqs,
    this.news,
    this.reviews,
    this.flashSaleItems,
  });
}

class ProductImage {
  final int id;
  final String imageUrl;

  ProductImage({required this.id, required this.imageUrl});
}

class ProductVideo {
  final int id;
  final String videoUrl;
  final String? thumbnailUrl;
  final String? title;
  final bool isActive;

  ProductVideo({
    required this.id,
    required this.videoUrl,
    this.thumbnailUrl,
    this.title,
    this.isActive = true,
  });
}

class ProductVariant {
  final int id;
  final String name;
  final String? color;
  final String? storage;
  final String price;
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
}

class ProductSpecRow {
  final int id;
  final String? specGroup;
  final String? specKey;
  final String? specValue;
  final int? productVariantId;

  ProductSpecRow({
    required this.id,
    this.specGroup,
    this.specKey,
    this.specValue,
    this.productVariantId,
  });
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
}

class ProductNews {
  final int id;
  final String title;
  final String content;
  final String? imageUrl;
  final DateTime? publishedAt;
  final int sortOrder;
  final bool isActive;

  ProductNews({
    required this.id,
    required this.title,
    required this.content,
    this.imageUrl,
    this.publishedAt,
    required this.sortOrder,
    this.isActive = true,
  });
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

  ProductReview({
    required this.id,
    required this.rating,
    this.comment,
    required this.createdAt,
    this.orderId,
    this.expPerformance,
    this.expBattery,
    this.expCamera,
  });
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
}

class FlashSale {
  final int id;
  final DateTime endAt;

  FlashSale({required this.id, required this.endAt});
}

class ProductDetailScreen extends StatefulWidget {
  final String slug;
  final String? variantId;

  const ProductDetailScreen({
    Key? key,
    required this.slug,
    this.variantId,
  }) : super(key: key);

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  late Product product;
  bool isLoading = true;
  String? error;

  String? selectedImg;
  ProductVariant? selectedVariant;
  int quantity = 1;
  int? openFaqId;
  Set<int> wishSet = {};
  List<Product> relatedProducts = [];
  List<ProductNews> visibleNews = [];
  List<ProductFaq> visibleFaqs = [];
  List<ProductReview> visibleReviews = [];

  String reviewFilter = 'all'; // all, with_images, verified, star_5, star_4, star_3, star_2, star_1
  bool showReviewModal = false;
  int reviewRating = 5;
  String reviewComment = '';
  int expPerformance = 5;
  int expBattery = 5;
  int expCamera = 5;

  String qaQuestion = '';
  String qaGuestName = '';
  bool qaSending = false;

  Duration? flashTimeLeft;

  @override
  void initState() {
    super.initState();
    _loadProduct();
    _startFlashSaleTimer();
  }

  @override
  void dispose() {
    super.dispose();
  }

  Future<void> _loadProduct() async {
    try {
      // TODO: Replace with actual API call
      // final response = await apiClient.get('/products/$widget.slug');
      // product = Product.fromJson(response);

      // Mock product for now
      product = Product(
        id: 1,
        name: 'iPhone 15 Pro Max',
        slug: widget.slug,
        shortDescription: 'Premium flagship smartphone',
        description: 'The latest iPhone with advanced features',
        mainImageUrl: 'https://via.placeholder.com/400',
        images: [],
        price: 30000000,
        stockQuantity: 10,
        categoryId: 1,
        variants: [],
        specs: [],
      );

      setState(() {
        isLoading = false;
        selectedImg = product.mainImageUrl;
        _initializeVariants();
        _initializeFaqs();
        _initializeNews();
        _loadWishlist();
        _loadRelatedProducts();
      });
    } catch (e) {
      setState(() {
        isLoading = false;
        error = 'Lỗi tải sản phẩm: $e';
      });
    }
  }

  void _initializeVariants() {
    if (product.variants.isNotEmpty) {
      ProductVariant targetVariant = product.variants[0];
      if (widget.variantId != null) {
        final matched = product.variants
            .firstWhere(
              (v) => v.id.toString() == widget.variantId,
              orElse: () => product.variants[0],
            );
        targetVariant = matched;
      }
      selectedVariant = targetVariant;
      if (targetVariant.imageUrl != null) {
        selectedImg = targetVariant.imageUrl;
      }
    }
  }

  void _initializeFaqs() {
    visibleFaqs = (product.faqs ?? [])
        .where((f) => f.isActive)
        .toList()
      ..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
    if (visibleFaqs.isNotEmpty) {
      openFaqId = visibleFaqs[0].id;
    }
  }

  void _initializeNews() {
    visibleNews = (product.news ?? [])
        .where((n) => n.isActive)
        .toList()
      ..sort((a, b) {
        final aTime = a.publishedAt?.millisecondsSinceEpoch ?? 0;
        final bTime = b.publishedAt?.millisecondsSinceEpoch ?? 0;
        if (aTime != bTime) return bTime.compareTo(aTime);
        return b.sortOrder.compareTo(a.sortOrder);
      });
  }

  Future<void> _loadWishlist() async {
    try {
      // TODO: Replace with actual API call
      // final token = await storage.read(key: 'auth_token');
      // final wishlistData = await apiClient.get('/wishlist', headers: {'Authorization': 'Bearer $token'});
      // setState(() {
      //   wishSet = Set.from(wishlistData.map((w) => w['product_id'] as int));
      // });
    } catch (e) {
      debugPrint('Error loading wishlist: $e');
    }
  }

  Future<void> _loadRelatedProducts() async {
    try {
      // TODO: Replace with actual API call
      // final response = await apiClient.get(
      //   '/products',
      //   queryParameters: {
      //     'category_id': product.categoryId,
      //     'limit': 20,
      //   },
      // );
      // var products = (response['data'] as List)
      //     .map((p) => Product.fromJson(p))
      //     .where((p) => p.id != product.id)
      //     .take(5)
      //     .toList();
      // setState(() {
      //   relatedProducts = products;
      // });
    } catch (e) {
      debugPrint('Error loading related products: $e');
    }
  }

  Future<void> _toggleWishlist(int productId) async {
    final hasAuth = false; // TODO: Check actual auth status
    if (!hasAuth) {
      Navigator.pushNamed(context, '/login');
      return;
    }

    setState(() {
      if (wishSet.contains(productId)) {
        wishSet.remove(productId);
      } else {
        wishSet.add(productId);
      }
    });

    try {
      // TODO: Replace with actual API call
      // final token = await storage.read(key: 'auth_token');
      // await apiClient.post('/wishlist/toggle/$productId', headers: {'Authorization': 'Bearer $token'});
    } catch (e) {
      setState(() {
        if (wishSet.contains(productId)) {
          wishSet.remove(productId);
        } else {
          wishSet.add(productId);
        }
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Lỗi: $e')),
      );
    }
  }

  void _startFlashSaleTimer() {
    Future.delayed(const Duration(seconds: 1), () {
      if (mounted && product.flashSaleItems != null && product.flashSaleItems!.isNotEmpty) {
        final flashSale = product.flashSaleItems![0];
        final now = DateTime.now();
        final endTime = flashSale.flashSale.endAt;
        final diff = endTime.difference(now);

        if (diff.isNegative) {
          setState(() {
            flashTimeLeft = null;
          });
        } else {
          setState(() {
            flashTimeLeft = diff;
          });
          _startFlashSaleTimer();
        }
      }
    });
  }

  void _addToCart() {
    if (selectedVariant == null && product.variants.isNotEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng chọn một biến thể')),
      );
      return;
    }

    final price = _getDisplayPrice();
    // TODO: Add to cart logic
    // addToCart(
    //   productId: product.id,
    //   variantId: selectedVariant?.id,
    //   quantity: quantity,
    //   price: price,
    // );

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Đã thêm $quantity sản phẩm vào giỏ hàng')),
    );
  }

  double _getDisplayPrice() {
    if (product.flashSaleItems != null && product.flashSaleItems!.isNotEmpty) {
      return product.flashSaleItems![0].flashSalePrice;
    }
    if (selectedVariant != null) {
      return selectedVariant!.effectivePrice;
    }
    return product.price;
  }

  List<ProductReview> _getFilteredReviews() {
    var reviews = List<ProductReview>.from(visibleReviews);
    reviews.sort((a, b) => b.createdAt.compareTo(a.createdAt));

    switch (reviewFilter) {
      case 'verified':
        return reviews.where((r) => r.orderId != null).toList();
      case 'star_5':
        return reviews.where((r) => r.rating.toInt() == 5).toList();
      case 'star_4':
        return reviews.where((r) => r.rating.toInt() == 4).toList();
      case 'star_3':
        return reviews.where((r) => r.rating.toInt() == 3).toList();
      case 'star_2':
        return reviews.where((r) => r.rating.toInt() == 2).toList();
      case 'star_1':
        return reviews.where((r) => r.rating.toInt() == 1).toList();
      default:
        return reviews;
    }
  }

  Map<String, dynamic> _getReviewStats() {
    if (visibleReviews.isEmpty) {
      return {
        'total': 0,
        'avg': 0.0,
        'counts': {1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
      };
    }

    final counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
    double sum = 0;

    for (var review in visibleReviews) {
      final rating = review.rating.toInt();
      counts[rating] = (counts[rating] ?? 0) + 1;
      sum += rating;
    }

    return {
      'total': visibleReviews.length,
      'avg': sum / visibleReviews.length,
      'counts': counts,
    };
  }

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Chi tiết sản phẩm')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (error != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Chi tiết sản phẩm')),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(error!),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Quay lại'),
              ),
            ],
          ),
        ),
      );
    }

    final reviewStats = _getReviewStats();
    final filteredReviews = _getFilteredReviews();
    final displayPrice = _getDisplayPrice();
    final hasFlashSale =
        product.flashSaleItems != null && product.flashSaleItems!.isNotEmpty;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Chi tiết sản phẩm'),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Breadcrumb
              Padding(
                padding: const EdgeInsets.only(bottom: 16.0),
                child: Wrap(
                  spacing: 8,
                  children: [
                    GestureDetector(
                      onTap: () => Navigator.pushNamed(context, '/'),
                      child: const Text(
                        'Trang chủ',
                        style: TextStyle(color: Colors.blue),
                      ),
                    ),
                    const Text('/'),
                    GestureDetector(
                      onTap: () => Navigator.pushNamed(context, '/products'),
                      child: const Text(
                        'Danh sách sản phẩm',
                        style: TextStyle(color: Colors.blue),
                      ),
                    ),
                    const Text('/'),
                    Text(product.name),
                  ],
                ),
              ),

              // Product Name
              Padding(
                padding: const EdgeInsets.only(bottom: 24.0),
                child: Text(
                  product.name,
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),

              // Flash Sale Timer
              if (hasFlashSale && flashTimeLeft != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: Colors.red[50],
                    border: Border.all(color: Colors.red),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Column(
                    children: [
                      const Text(
                        '🔥 FLASH SALE',
                        style: TextStyle(
                          color: Colors.red,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          _buildTimeUnit(
                            flashTimeLeft!.inHours % 24,
                            'giờ',
                          ),
                          const Text(
                            ':',
                            style: TextStyle(fontSize: 18),
                          ),
                          _buildTimeUnit(
                            flashTimeLeft!.inMinutes % 60,
                            'phút',
                          ),
                          const Text(
                            ':',
                            style: TextStyle(fontSize: 18),
                          ),
                          _buildTimeUnit(
                            flashTimeLeft!.inSeconds % 60,
                            'giây',
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

              // Main Grid: Image Gallery + Info
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Image Gallery
                  Expanded(
                    flex: 1,
                    child: Column(
                      children: [
                        // Main Image
                        Container(
                          color: Colors.grey[200],
                          height: 300,
                          width: double.infinity,
                          child: Image.network(
                            selectedImg ?? product.mainImageUrl,
                            fit: BoxFit.cover,
                          ),
                        ),
                        const SizedBox(height: 12),
                        // Thumbnail Strip
                        if ((product.images.isNotEmpty ||
                            (product.videos?.isNotEmpty ?? false)))
                          SizedBox(
                            height: 80,
                            child: ListView.builder(
                              scrollDirection: Axis.horizontal,
                              itemCount: (product.images.length) +
                                  ((product.videos?.length ?? 0)),
                              itemBuilder: (context, index) {
                                if (index < product.images.length) {
                                  final image = product.images[index];
                                  return GestureDetector(
                                    onTap: () {
                                      setState(() {
                                        selectedImg = image.imageUrl;
                                      });
                                    },
                                    child: Container(
                                      width: 80,
                                      margin: const EdgeInsets.only(right: 8),
                                      decoration: BoxDecoration(
                                        border: Border.all(
                                          color: selectedImg == image.imageUrl
                                              ? Colors.blue
                                              : Colors.grey,
                                        ),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Image.network(
                                        image.imageUrl,
                                        fit: BoxFit.cover,
                                      ),
                                    ),
                                  );
                                } else {
                                  final videoIndex =
                                      index - product.images.length;
                                  final video = product.videos![videoIndex];
                                  return GestureDetector(
                                    onTap: () {
                                      setState(() {
                                        selectedImg = video.videoUrl;
                                      });
                                    },
                                    child: Container(
                                      width: 80,
                                      margin: const EdgeInsets.only(right: 8),
                                      decoration: BoxDecoration(
                                        border: Border.all(
                                          color: selectedImg == video.videoUrl
                                              ? Colors.blue
                                              : Colors.grey,
                                        ),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Stack(
                                        alignment: Alignment.center,
                                        children: [
                                          Image.network(
                                            video.thumbnailUrl ??
                                                'https://via.placeholder.com/80',
                                            fit: BoxFit.cover,
                                          ),
                                          const Icon(
                                            Icons.play_circle_outline,
                                            color: Colors.white,
                                          ),
                                        ],
                                      ),
                                    ),
                                  );
                                }
                              },
                            ),
                          ),
                      ],
                    ),
                  ),

                  const SizedBox(width: 24),

                  // Product Info
                  Expanded(
                    flex: 1,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Price
                        Row(
                          children: [
                            Text(
                              '${formatCurrency(displayPrice)} đ',
                              style: const TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: Colors.red,
                              ),
                            ),
                            if (hasFlashSale ||
                                (selectedVariant != null &&
                                    selectedVariant!.effectivePrice <
                                        double.parse(selectedVariant!.price)))
                              Padding(
                                padding: const EdgeInsets.only(left: 12.0),
                                child: Text(
                                  '${formatCurrency(double.parse(selectedVariant?.price ?? '${product.price}'))} đ',
                                  style: const TextStyle(
                                    fontSize: 16,
                                    decoration: TextDecoration.lineThrough,
                                    color: Colors.grey,
                                  ),
                                ),
                              ),
                          ],
                        ),

                        const SizedBox(height: 24),

                        // Variants
                        if (product.variants.isNotEmpty)
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Chọn phiên bản',
                                style: TextStyle(fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 12),
                              Wrap(
                                spacing: 8,
                                runSpacing: 8,
                                children: product.variants.map((variant) {
                                  final isSelected =
                                      selectedVariant?.id == variant.id;
                                  return GestureDetector(
                                    onTap: () {
                                      setState(() {
                                        selectedVariant = variant;
                                        if (variant.imageUrl != null) {
                                          selectedImg = variant.imageUrl;
                                        }
                                      });
                                    },
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 12,
                                        vertical: 8,
                                      ),
                                      decoration: BoxDecoration(
                                        border: Border.all(
                                          color: isSelected
                                              ? Colors.blue
                                              : Colors.grey,
                                          width: isSelected ? 2 : 1,
                                        ),
                                        borderRadius: BorderRadius.circular(4),
                                        color: isSelected
                                            ? Colors.blue[50]
                                            : Colors.white,
                                      ),
                                      child: Text(
                                        variant.name,
                                        style: TextStyle(
                                          color: isSelected
                                              ? Colors.blue
                                              : Colors.black,
                                          fontWeight: isSelected
                                              ? FontWeight.bold
                                              : FontWeight.normal,
                                        ),
                                      ),
                                    ),
                                  );
                                }).toList(),
                              ),
                              const SizedBox(height: 24),
                            ],
                          ),

                        // Description
                        Text(
                          product.description ?? 'Không có mô tả',
                          style: const TextStyle(fontSize: 14),
                        ),

                        const SizedBox(height: 24),

                        // Metadata
                        Column(
                          children: [
                            _buildMetaItem('DANH MỤC', product.brand ?? 'N/A'),
                            _buildMetaItem('SKU', product.sku ?? 'N/A'),
                            _buildMetaItem(
                              'TỒN KHO',
                              (selectedVariant?.stockQuantity ??
                                          product.stockQuantity) >
                                      0
                                  ? 'Còn hàng'
                                  : 'Hết hàng',
                              color: (selectedVariant?.stockQuantity ??
                                          product.stockQuantity) >
                                      0
                                  ? Colors.green
                                  : Colors.red,
                            ),
                          ],
                        ),

                        const SizedBox(height: 24),

                        // Actions
                        Row(
                          children: [
                            // Quantity
                            Container(
                              decoration: BoxDecoration(
                                border: Border.all(color: Colors.grey),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Row(
                                children: [
                                  IconButton(
                                    onPressed: () => setState(
                                        () => quantity = (quantity - 1).clamp(1, 999)),
                                    icon: const Icon(Icons.remove),
                                    iconSize: 18,
                                  ),
                                  SizedBox(
                                    width: 50,
                                    child: TextField(
                                      controller: TextEditingController(text: quantity.toString()),
                                      onChanged: (value) {
                                        setState(() {
                                          quantity = int.tryParse(value) ?? 1;
                                          quantity =
                                              quantity.clamp(1, 999);
                                        });
                                      },
                                      textAlign: TextAlign.center,
                                      decoration: const InputDecoration(
                                        border: InputBorder.none,
                                      ),
                                    ),
                                  ),
                                  IconButton(
                                    onPressed: () => setState(
                                        () => quantity = (quantity + 1).clamp(1, 999)),
                                    icon: const Icon(Icons.add),
                                    iconSize: 18,
                                  ),
                                ],
                              ),
                            ),

                            const SizedBox(width: 12),

                            // Add to Cart Button
                            Expanded(
                              child: ElevatedButton(
                                onPressed: _addToCart,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.blue,
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(
                                      vertical: 12),
                                ),
                                child: const Text('THÊM VÀO GIỎ'),
                              ),
                            ),

                            const SizedBox(width: 12),

                            // Wishlist Button
                            IconButton(
                              onPressed: () =>
                                  _toggleWishlist(product.id),
                              icon: Icon(
                                wishSet.contains(product.id)
                                    ? Icons.favorite
                                    : Icons.favorite_border,
                                color: wishSet.contains(product.id)
                                    ? Colors.red
                                    : null,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 48),

              // Specs Section
              if (product.specs.isNotEmpty)
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Padding(
                      padding: EdgeInsets.only(bottom: 16.0),
                      child: Text(
                        'Thông số kỹ thuật',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    Container(
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.grey[300]!),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Column(
                        children: product.specs.map((spec) {
                          return Column(
                            children: [
                              Padding(
                                padding: const EdgeInsets.all(12.0),
                                child: Row(
                                  children: [
                                    Expanded(
                                      flex: 1,
                                      child: Text(
                                        spec.specKey ?? '',
                                        style: const TextStyle(
                                            fontWeight: FontWeight.w500),
                                      ),
                                    ),
                                    Expanded(
                                      flex: 1,
                                      child: Text(
                                        spec.specValue ?? '',
                                        textAlign: TextAlign.end,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              if (spec != product.specs.last)
                                Divider(
                                  height: 0,
                                  color: Colors.grey[300],
                                ),
                            ],
                          );
                        }).toList(),
                      ),
                    ),
                    const SizedBox(height: 48),
                  ],
                ),

              // FAQ Section
              if (visibleFaqs.isNotEmpty)
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Padding(
                      padding: EdgeInsets.only(bottom: 16.0),
                      child: Text(
                        'Câu hỏi thường gặp',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    Column(
                      children: visibleFaqs.map((faq) {
                        final isOpen = openFaqId == faq.id;
                        return GestureDetector(
                          onTap: () => setState(() {
                            openFaqId = isOpen ? null : faq.id;
                          }),
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              border: Border.all(
                                color: Colors.grey[300]!,
                              ),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            margin: const EdgeInsets.only(bottom: 8),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Text(
                                        faq.question,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                    Icon(
                                      isOpen
                                          ? Icons.expand_less
                                          : Icons.expand_more,
                                    ),
                                  ],
                                ),
                                if (isOpen) ...[
                                  const SizedBox(height: 12),
                                  Text(faq.answer),
                                ],
                              ],
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 48),
                  ],
                ),

              // Reviews Section
              if (visibleReviews.isNotEmpty)
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Padding(
                      padding: EdgeInsets.only(bottom: 16.0),
                      child: Text(
                        'Đánh giá sản phẩm',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),

                    // Review Stats
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.grey[300]!),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Đánh giá trung bình: ${(reviewStats['avg'] as double).toStringAsFixed(1)} / 5',
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            'Tổng số đánh giá: ${reviewStats['total']}',
                          ),
                          const SizedBox(height: 12),
                          ...(reviewStats['counts'] as Map<int, int>)
                              .entries
                              .map((e) {
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 8.0),
                              child: Row(
                                children: [
                                  Text('${e.key} ⭐'),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: LinearProgressIndicator(
                                      value: reviewStats['total'] > 0
                                          ? ((e.value as int) /
                                              (reviewStats['total'] as int))
                                          : 0.0,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Text('${e.value}'),
                                ],
                              ),
                            );
                          }).toList(),
                        ],
                      ),
                    ),

                    const SizedBox(height: 24),

                    // Review Filter
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          'all',
                          'verified',
                          'star_5',
                          'star_4',
                          'star_3',
                          'star_2',
                          'star_1',
                        ]
                            .map((filter) {
                          final filterLabels = {
                            'all': 'Tất cả',
                            'verified': 'Đã xác thực',
                            'star_5': '5 ⭐',
                            'star_4': '4 ⭐',
                            'star_3': '3 ⭐',
                            'star_2': '2 ⭐',
                            'star_1': '1 ⭐',
                          };
                          final isSelected = reviewFilter == filter;
                          return Padding(
                            padding: const EdgeInsets.only(right: 8.0),
                            child: FilterChip(
                              label: Text(filterLabels[filter] ?? filter),
                              selected: isSelected,
                              onSelected: (_) {
                                setState(() {
                                  reviewFilter = filter;
                                });
                              },
                            ),
                          );
                        }).toList(),
                      ),
                    ),

                    const SizedBox(height: 24),

                    // Reviews List
                    Column(
                      children: filteredReviews.map((review) {
                        return Container(
                          padding: const EdgeInsets.all(12),
                          margin: const EdgeInsets.only(bottom: 12),
                          decoration: BoxDecoration(
                            border: Border.all(color: Colors.grey[300]!),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    '⭐ ${review.rating.toStringAsFixed(1)}',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  if (review.orderId != null)
                                    const Chip(
                                      label: Text('Đã xác thực'),
                                      backgroundColor: Colors.green,
                                    ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              if (review.comment != null)
                                Text(review.comment!),
                              const SizedBox(height: 8),
                              Text(
                                review.createdAt,
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey[600],
                                ),
                              ),
                            ],
                          ),
                        );
                      }).toList(),
                    ),

                    ElevatedButton(
                      onPressed: () {
                        setState(() {
                          showReviewModal = true;
                        });
                      },
                      child: const Text('Viết đánh giá'),
                    ),

                    const SizedBox(height: 48),
                  ],
                ),

              // Related Products Section
              if (relatedProducts.isNotEmpty)
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Padding(
                      padding: EdgeInsets.only(bottom: 16.0),
                      child: Text(
                        'Sản phẩm liên quan',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        childAspectRatio: 0.8,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                      ),
                      itemCount: relatedProducts.length,
                      itemBuilder: (context, index) {
                        final related = relatedProducts[index];
                        return GestureDetector(
                          onTap: () => Navigator.pushNamed(
                            context,
                            '/product/${related.slug}',
                          ),
                          child: Container(
                            decoration: BoxDecoration(
                              border: Border.all(color: Colors.grey[300]!),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Expanded(
                                  child: Container(
                                    color: Colors.grey[200],
                                    child: Image.network(
                                      related.mainImageUrl,
                                      fit: BoxFit.cover,
                                      width: double.infinity,
                                    ),
                                  ),
                                ),
                                Padding(
                                  padding: const EdgeInsets.all(8.0),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        related.name,
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        '${formatCurrency(related.price)} đ',
                                        style: const TextStyle(
                                          color: Colors.red,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      const SizedBox(height: 8),
                                      GestureDetector(
                                        onTap: () =>
                                            _toggleWishlist(related.id),
                                        child: Icon(
                                          wishSet.contains(related.id)
                                              ? Icons.favorite
                                              : Icons.favorite_border,
                                          color:
                                              wishSet.contains(related.id)
                                                  ? Colors.red
                                                  : null,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                    const SizedBox(height: 48),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMetaItem(String label, String value, {Color? color}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: Row(
        children: [
          Text(
            label,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
          ),
          const SizedBox(width: 16),
          Text(
            value,
            style: TextStyle(color: color),
          ),
        ],
      ),
    );
  }

  Widget _buildTimeUnit(int value, String unit) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8.0),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.red,
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(
              value.toString().padLeft(2, '0'),
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            unit,
            style: const TextStyle(fontSize: 10),
          ),
        ],
      ),
    );
  }
}
