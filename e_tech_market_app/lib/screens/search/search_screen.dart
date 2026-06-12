import 'dart:async';

import 'package:flutter/material.dart';

import '../../services/products_service.dart';
import '../../utils/network_utils.dart';
import '../../utils/translation.dart';
import '../products/product_detail_screen.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final TextEditingController _searchController = TextEditingController();
  final FocusNode _focusNode = FocusNode();
  Timer? _debounceTimer;

  List<dynamic> _searchResults = [];
  bool _isLoading = false;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    // Tự động focus vào ô tìm kiếm khi mở màn hình
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _focusNode.requestFocus();
    });
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _searchController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  // Hàm xử lý logic tìm kiếm
  Future<void> _performSearch(String query) async {
    setState(() {
      _searchQuery = query;
    });

    if (query.trim().isEmpty) {
      setState(() {
        _searchResults = [];
        _isLoading = false;
      });
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final res = await ProductsService.fetchProducts(
        search: query,
        limit: 20,
      );
      if (mounted) {
        setState(() {
          _searchResults = res['data'] ?? [];
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  // Hàm định dạng giá tiền (VD: 1000000 -> 1.000.000)
  String _formatPrice(double price) {
    return price.toStringAsFixed(0).replaceAllMapped(
        RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]}.');
  }

  // Hàm xử lý lấy URL ảnh sản phẩm
  String _resolveProductImageUrl(Map<String, dynamic> product) {
    final rawMainImage = product['main_image_url']?.toString().trim();
    if (rawMainImage != null && rawMainImage.isNotEmpty) {
      return NetworkUtils.fixDeviceUrl(rawMainImage);
    }
    final images = product['images'] as List<dynamic>?;
    if (images != null && images.isNotEmpty) {
      for (var image in images) {
        final url = image['url']?.toString().trim() ??
            image['image_url']?.toString().trim();
        if (url != null && url.isNotEmpty) {
          return NetworkUtils.fixDeviceUrl(url);
        }
      }
    }
    return '';
  }

  // Hàm lấy giá hiển thị (thường là giá thấp nhất của các biến thể)
  double _getDisplayPrice(Map<String, dynamic> product) {
    final variants = product['variants'] as List<dynamic>?;
    if (variants != null && variants.isNotEmpty) {
      final sortedVariants = List.from(variants);
      sortedVariants.sort((a, b) {
        final aPrice =
            double.tryParse(a['effective_price']?.toString() ?? '0') ?? 0;
        final bPrice =
            double.tryParse(b['effective_price']?.toString() ?? '0') ?? 0;
        return aPrice.compareTo(bPrice);
      });
      return double.tryParse(
              sortedVariants.first['effective_price']?.toString() ?? '0') ??
          0;
    }
    return double.tryParse(product['effective_price']?.toString() ?? '0') ?? 0;
  }

  // Điều hướng đến trang chi tiết sản phẩm
  void _navigateToProduct(Map<String, dynamic> product) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ProductDetailScreen(
          slug: product['slug'] ?? '',
          variantId: null,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: colorScheme.surface,
      appBar: AppBar(
        backgroundColor: colorScheme.surface,
        elevation: 0,
        leading: BackButton(
          color: colorScheme.onSurface,
        ),
        title: Container(
          decoration: BoxDecoration(
            color: colorScheme.surface,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: Theme.of(context).colorScheme.outline,
              width: 0.15,
            ),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 10),
          child: TextField(
            controller: _searchController,
            focusNode: _focusNode,
            textAlignVertical: TextAlignVertical.center,
            decoration: InputDecoration(
              icon: Icon(
                Icons.search_rounded,
                color: Colors.grey.shade600,
                size: 20,
              ),
              hintText: 'Tìm kiếm .....',
              hintStyle: TextStyle(
                color: Colors.grey.shade600,
                fontSize: 16,
              ),
              
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(vertical: 12),
              isDense: true,
              // Nút xóa nhanh nội dung tìm kiếm
              suffixIcon: _searchController.text.isNotEmpty
                  ? IconButton(
                      icon: Icon(
                        Icons.clear_rounded,
                        color: Colors.grey.shade500,
                        size: 20,
                      ),
                      onPressed: () {
                        _searchController.clear();
                        _performSearch('');
                      },
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(
                        minWidth: 20,
                        minHeight: 20,
                      ),
                    )
                  : null,
            ),
            textInputAction: TextInputAction.search,
            onSubmitted: _performSearch,
            onChanged: (val) {
              setState(() {}); // Cập nhật để hiển thị/ẩn nút xóa
              // Debounce search-as-you-type (300ms delay)
              _debounceTimer?.cancel();
              _debounceTimer = Timer(const Duration(milliseconds: 300), () {
                _performSearch(val);
              });
            },
          ),
        ),
      ),
      body: Column(
        children: [
          Expanded(child: _buildBody()),
          _buildSpecialOffer(context),
        ],
      ),
    );
  }

  Widget _buildSpecialOffer(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Theme.of(context).colorScheme.outline, width: 0.15),
      ),
      padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
      margin: const EdgeInsets.all(16),
      child: Stack(
        alignment: Alignment.centerLeft,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                     Text(
                      'Bạn đang tìm linh kiện?',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 18,
                        color: colorScheme.onSurface,
                      ),
                    ),
                    const SizedBox(height: 8),
                    RichText(
                      text:  TextSpan(
                        style: TextStyle(
                          color: colorScheme.onSurface,
                          fontSize: 14,
                        ),
                        children: [
                          TextSpan(text: 'Giảm thêm '),
                          TextSpan(
                            text: '10%',
                            style: TextStyle(
                              color: Color(0xFFF26522),
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          TextSpan(text: ' khi mua combo'),
                        ],
                      ),
                    ),
                     Text(
                      'Mainboard + CPU',
                      style: TextStyle(
                        color: colorScheme.onSurface,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: () {},
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xffBD0F0F),
                        foregroundColor: Colors.white,
                        elevation: 0,
                        // SỬA ĐOẠN NÀY: Dùng RoundedRectangleBorder chuẩn của Flutter
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(30), // Bo tròn mềm mại giống nút "XEM NGAY" trong ảnh
                        ),
                        minimumSize: const Size(120, 36),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 24, vertical: 8),
                      ),
                      child: const Text(
                        'XEM NGAY',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 80),
            ],
          ),
          Positioned(
            right: 0,
            bottom: -10,
            child: Opacity(
              opacity: 0.1,
              child: Image.asset(
                'assets/icons/logo_shadow.png',
                width: 100,
                color: Colors.black,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBody() {
    // Trạng thái 1: Chưa nhập từ khóa tìm kiếm
    if (_searchQuery.trim().isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.search_rounded, size: 100, color: Colors.grey.shade300),
            const SizedBox(height: 16),
            Text(
              Trans.whatAreYouLookingFor,
              style: TextStyle(
                  color: Colors.grey.shade600,
                  fontSize: 16,
                  fontWeight: FontWeight.w500),
            ),
          ],
        ),
      );
    }

    // Trạng thái 2: Đang tải dữ liệu (Sử dụng hiệu ứng Skeleton)
    if (_isLoading) {
      return _buildSkeletonLoader();
    }

    // Trạng thái 3: Không tìm thấy kết quả
    if (_searchResults.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.search_off_rounded,
                  size: 100, color: Colors.grey.shade300),
              const SizedBox(height: 16),
              Text(
                'Không tìm thấy kết quả phù hợp',
                style: TextStyle(
                    color: Colors.grey.shade800,
                    fontSize: 18,
                    fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(
                'Thử lại với từ khóa khác hoặc kiểm tra xem có lỗi chính tả không nhé.',
                style: TextStyle(color: Colors.grey.shade500, fontSize: 14),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    // Trạng thái 4: Hiển thị danh sách kết quả (Bố cục mới dạng Card)
    return ListView.builder(
      itemCount: _searchResults.length,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      itemBuilder: (context, index) {
        final product = _searchResults[index];
        final displayPrice = _getDisplayPrice(product);
        final imageUrl = _resolveProductImageUrl(product);

        // Giả lập tính toán % giảm giá nếu API trả về giá gốc (price)
        final double originalPrice =
            double.tryParse(product['price']?.toString() ?? '0') ?? 0;
        final int discountPercentage = (originalPrice > displayPrice)
            ? (((originalPrice - displayPrice) / originalPrice) * 100).round()
            : 0;

        return Container(
          margin: const EdgeInsets.only(bottom: 14),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: Theme.of(context).colorScheme.outline, width: 0.15),
          ),
          child: InkWell(
            borderRadius: BorderRadius.circular(10),
            onTap: () => _navigateToProduct(product),
            child: Padding(
              padding: const EdgeInsets.all(12.0),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // --- Khối ảnh sản phẩm ---
                  Stack(
                    children: [
                      Container(
                        width: 95,
                        height: 95,
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.surface,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: Theme.of(context).colorScheme.outline, width: 0.15),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: imageUrl.isEmpty
                              ? Icon(Icons.image_not_supported_rounded,
                                  color: Colors.grey.shade300, size: 35)
                              : Image.network(
                                  imageUrl,
                                  fit: BoxFit.cover,
                                  // Xử lý lỗi khi không tải được ảnh
                                  errorBuilder: (context, error, stackTrace) =>
                                      Icon(Icons.image_not_supported_rounded,
                                          color: Colors.grey.shade300),
                                ),
                        ),
                      ),
                      // Tag giảm giá (nếu có) nằm đè lên ảnh
                      if (discountPercentage > 0)
                        Positioned(
                          top: 0,
                          left: 0,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 2),
                            decoration: const BoxDecoration(
                              color: Colors.orange,
                              borderRadius: BorderRadius.only(
                                topLeft: Radius.circular(10),
                                bottomRight: Radius.circular(8),
                              ),
                            ),
                            child: Text(
                              '-$discountPercentage%',
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold),
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(width: 14),

                  // --- Khối thông tin văn bản ---
                  Expanded(
                    child: SizedBox(
                      // Cố định chiều cao của khối văn bản bằng chiều cao ảnh
                      height: 95,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        // Đẩy phần giá tiền xuống sát đáy
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Tên sản phẩm (tối đa 2 dòng)
                              Text(
                                product['name'] ?? '',
                                style: TextStyle(
                                  fontWeight: FontWeight.normal,
                                  fontSize: 13,
                                  color: Theme.of(context).colorScheme.onSurface,
                                  height: 1.4, // Điều chỉnh giãn dòng
                                ),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 4),
                              // Dòng nhãn phụ (VD: Mall, Đã bán)
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 5, vertical: 1.5),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFFDE6DE),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: const Text(
                                      'Chính hãng',
                                      style: TextStyle(
                                          color: Color(0xFFF26522),
                                          fontSize: 10,
                                          fontWeight: FontWeight.w500),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),

                          // Khối giá tiền (Giá bán hiện tại & Giá gốc)
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${_formatPrice(displayPrice)} đ',
                                style: const TextStyle(
                                  color: Color(0xFFFF4E02),
                                  fontWeight: FontWeight.w700,
                                  fontSize: 15,
                                ),
                              ),
                              if (discountPercentage > 0)
                                // Giá gốc màu xám mờ và gạch ngang
                                Text(
                                  '${_formatPrice(originalPrice)} đ',
                                  style: TextStyle(
                                    color: Colors.grey.shade500,
                                    decoration: TextDecoration.lineThrough,
                                    fontSize: 12,
                                  ),
                                ),
                            ],
                          ),
                        ],
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
  }

  // --- Khối tạo hiệu ứng Skeleton (Loading giả lập) ---
  Widget _buildSkeletonLoader() {
    return ListView.builder(
      itemCount: 5, // Hiển thị 5 khung xám mờ
      padding: const EdgeInsets.all(16),
      itemBuilder: (context, index) {
        return Container(
          margin: const EdgeInsets.only(bottom: 14),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(
            children: [
              // Khung ảnh skeleton
              Container(
                width: 95,
                height: 95,
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              const SizedBox(width: 14),
              // Khung văn bản skeleton
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                        width: double.infinity,
                        height: 16,
                        color: Colors.grey.shade100),
                    const SizedBox(height: 8),
                    Container(
                        width: 150, height: 14, color: Colors.grey.shade100),
                    const SizedBox(height: 20),
                    Container(
                        width: 80, height: 18, color: Colors.grey.shade100),
                  ],
                ),
              )
            ],
          ),
        );
      },
    );
  }
}