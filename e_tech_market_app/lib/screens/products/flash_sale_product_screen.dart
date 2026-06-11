import 'dart:async';
import 'package:flutter/material.dart';
import '../../services/flash_sale_service.dart';
import '../../utils/network_utils.dart';
import 'product_detail_screen.dart';

class FlashSaleProductScreen extends StatefulWidget {
  const FlashSaleProductScreen({super.key});

  @override
  State<FlashSaleProductScreen> createState() => _FlashSaleProductScreenState();
}

class _FlashSaleProductScreenState extends State<FlashSaleProductScreen> {
  Map<String, dynamic>? _flashSale;
  bool _isLoading = true;
  String? _error;

  // State quản lý thời gian đếm ngược
  bool _isCurrentlyActive = false;
  int _hours = 0;
  int _minutes = 0;
  int _seconds = 0;
  Timer? _timer;

  // State cho search
  bool _showSearch = false;
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  // State cho lọc danh mục (lấy từ dữ liệu flash sale)
  List<String> _categoryNames = [];
  int _selectedCategoryIndex = 0;

  // Items đã lọc theo danh mục và search
  List<dynamic> _filteredItems = [];

  // Phân trang
  final ScrollController _scrollController = ScrollController();
  int _currentPage = 1;
  static const int _itemsPerPage = 20;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    _loadFlashSale();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _searchController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    // Không dùng infinite scroll nữa, dùng phân trang bằng nút
  }

  Future<void> _loadFlashSale() async {
    try {
      final data = await FlashSaleService.fetchCurrentFlashSale();
      if (!mounted) return;

      // Trích xuất danh mục từ dữ liệu flash sale
      final items = (data?['items'] as List<dynamic>?)
              ?.where((item) => item != null && item['product'] != null)
              .toList() ??
          [];

      final categoriesSet = <String>{};
      for (final item in items) {
        final product = item['product'] as Map<String, dynamic>?;
        final category = product?['category'] as Map<String, dynamic>?;
        final categoryName = category?['name']?.toString();

        if (categoryName != null && categoryName.isNotEmpty) {
          categoriesSet.add(categoryName);
        }
      }

      final categoryNames = categoriesSet.isNotEmpty
          ? ['TẤT CẢ', ...categoriesSet.toList()]
          : <String>['TẤT CẢ'];

      setState(() {
        _flashSale = data;
        _categoryNames = categoryNames;
        _isLoading = false;
        _filteredItems = items;
      });

      if (data != null) {
        _updateActiveStatus();
        _startCountdown();
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  void _updateActiveStatus() {
    if (_flashSale == null) return;
    final now = DateTime.now().millisecondsSinceEpoch;
    final startStr = (_flashSale!['start_at'] ?? '').toString().replaceAll(' ', 'T');
    final endStr = (_flashSale!['end_at'] ?? '').toString().replaceAll(' ', 'T');

    final start = DateTime.tryParse(startStr)?.millisecondsSinceEpoch ?? 0;
    final end = DateTime.tryParse(endStr)?.millisecondsSinceEpoch ?? 0;

    setState(() {
      _isCurrentlyActive = now >= start && now <= end;
    });
  }

  void _startCountdown() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted || _flashSale == null) return;

      final now = DateTime.now().millisecondsSinceEpoch;
      final endStr = (_flashSale!['end_at'] ?? '').toString().replaceAll(' ', 'T');
      final end = DateTime.tryParse(endStr)?.millisecondsSinceEpoch ?? 0;
      final diff = end - now;

      if (diff <= 0) {
        setState(() {
          _isCurrentlyActive = false;
          _hours = 0;
          _minutes = 0;
          _seconds = 0;
          _flashSale = null;
        });
        _timer?.cancel();
      } else {
        final h = (diff ~/ (1000 * 60 * 60)) % 24;
        final m = (diff ~/ (1000 * 60)) % 60;
        final s = (diff ~/ 1000) % 60;

        setState(() {
          _isCurrentlyActive = true;
          _hours = h;
          _minutes = m;
          _seconds = s;
        });
      }
    });
  }

  void _navigateToProduct(Map<String, dynamic> item) {
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

  String _formatPrice(double price) {
    return price.toStringAsFixed(0).replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (match) => '${match[1]}.',
        );
  }

  void _filterItems() {
    final allItems = (_flashSale?['items'] as List<dynamic>?)
            ?.where((item) => item != null && item['product'] != null)
            .toList() ??
        [];

    var filtered = allItems;

    // Lọc theo danh mục (index 0 = Tất cả)
    if (_selectedCategoryIndex > 0 && _selectedCategoryIndex <= _categoryNames.length) {
      final selectedCategory = _categoryNames[_selectedCategoryIndex];
      filtered = filtered.where((item) {
        final product = item['product'] as Map<String, dynamic>?;
        final category = product?['category'] as Map<String, dynamic>?;
        return category?['name']?.toString() == selectedCategory;
      }).toList();
    }

    // Lọc theo search query
    if (_searchQuery.isNotEmpty) {
      final query = _searchQuery.toLowerCase();
      filtered = filtered.where((item) {
        final product = item['product'] as Map<String, dynamic>?;
        final variant = item['variant'] as Map<String, dynamic>?;
        final productName = product?['name']?.toString().toLowerCase() ?? '';
        final variantName = variant?['variant_name']?.toString().toLowerCase() ?? '';
        return productName.contains(query) || variantName.contains(query);
      }).toList();
    }

    setState(() {
      _filteredItems = filtered;
      _currentPage = 1;
    });
  }

  void _toggleSearch() {
    setState(() {
      _showSearch = !_showSearch;
      if (!_showSearch) {
        _searchController.clear();
        _searchQuery = '';
        _filterItems();
      }
    });
  }

  void _onSearchChanged(String value) {
    setState(() {
      _searchQuery = value;
    });
    _filterItems();
  }

  void _onCategorySelected(int index) {
    setState(() {
      _selectedCategoryIndex = index;
    });
    _filterItems();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      appBar: AppBar(
        title: _showSearch
            ? TextField(
                controller: _searchController,
                onChanged: _onSearchChanged,
                autofocus: true,
                style: const TextStyle(color: Colors.white, fontSize: 16),
                decoration: InputDecoration(
                  hintText: 'Tìm sản phẩm...',
                  hintStyle: TextStyle(
                    color: Colors.white.withOpacity(0.7),
                    fontSize: 16,
                  ),
                  border: InputBorder.none,
                ),
                cursorColor: Colors.white,
              )
            : Text(
                _flashSale?['name'] != null ? '⚡ ${_flashSale!['name'].toString().toUpperCase()}' : '⚡ FLASH SALE',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, letterSpacing: 0.5),
              ),
        centerTitle: false,
        backgroundColor: const Color(0xFFFF2424),
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: Icon(_showSearch ? Icons.close : Icons.search, size: 26),
            onPressed: _toggleSearch,
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFFFF2424)));
    }

    if (_error != null) {
      return Center(child: Text('Lỗi: $_error', style: const TextStyle(color: Colors.red)));
    }

    final items = _filteredItems;

    if (!_isCurrentlyActive || items.isEmpty) {
      return Center(
        child: Text(
          _searchQuery.isNotEmpty ? 'Không tìm thấy sản phẩm nào' : 'Không có sản phẩm Flash Sale nào đang diễn ra',
          style: const TextStyle(fontSize: 15, color: Colors.grey)),
      );
    }

    final int totalItems = _filteredItems.length;
    final int totalPages = (totalItems / _itemsPerPage).ceil();
    final int startIndex = (_currentPage - 1) * _itemsPerPage;
    
    final itemsToDisplay = _filteredItems
        .skip(startIndex)
        .take(_itemsPerPage)
        .toList();

    return Column(
      children: [
        // 1. THANH ĐẾM NGƯỢC THỜI GIAN ĐANG DIỄN RA (ĐÚNG NHƯ ẢNH MẪU)
        _buildHeaderCountdown(),

        // 2. THANH CHỌN DANH MỤC SẢN PHẨM CUỘN NGANG (MỚI THÊM THEO ẢNH)
        _buildCategoryTabs(),

        // 3. LƯỚI SẢN PHẨM GRIDVIEW
        Expanded(
          child: GridView.builder(
            controller: _scrollController,
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              childAspectRatio: 0.58, // Tỷ lệ chuẩn để hiển thị đầy đủ thông tin, không lo tràn màn hình
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
            ),
            itemCount: itemsToDisplay.length,
            itemBuilder: (context, index) {
              final item = itemsToDisplay[index] as Map<String, dynamic>;
              return _buildProductCard(item);
            },
          ),
        ),

        // 4. PHÂN TRANG (CÁC NÚT BẤM)
        if (totalPages > 1)
          Container(
            padding: const EdgeInsets.symmetric(vertical: 10),
            color: Theme.of(context).colorScheme.surface,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                IconButton(
                  icon: const Icon(Icons.chevron_left, size: 28),
                  color: const Color(0xFFFF2424),
                  onPressed: _currentPage > 1
                      ? () => setState(() {
                            _currentPage--;
                            _scrollController.animateTo(0, duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
                          })
                      : null,
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.grey[100],
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    'Trang $_currentPage / $totalPages',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.chevron_right, size: 28),
                  color: const Color(0xFFFF2424),
                  onPressed: _currentPage < totalPages
                      ? () => setState(() {
                            _currentPage++;
                            _scrollController.animateTo(0, duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
                          })
                      : null,
                ),
              ],
            ),
          ),
      ],
    );
  }

  Widget _buildHeaderCountdown() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      color: const Color(0xFFFF2424),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              const Icon(Icons.access_time_filled, color: Colors.white, size: 22),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'ĐANG DIỄN RA',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                  Text(
                    'Kết thúc trong',
                    style: TextStyle(color: Colors.white.withOpacity(0.9), fontSize: 11),
                  ),
                ],
              ),
            ],
          ),
          Row(
            children: [
              _buildTimerBox(_hours),
              _buildTimerSep(),
              _buildTimerBox(_minutes),
              _buildTimerSep(),
              _buildTimerBox(_seconds),
            ],
          )
        ],
      ),
    );
  }

  Widget _buildTimerBox(int value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        value.toString().padLeft(2, '0'),
        style: const TextStyle(
          color: Color(0xFFFF2424),
          fontSize: 13,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Widget _buildTimerSep() {
    return const Padding(
      padding: EdgeInsets.symmetric(horizontal: 3),
      child: Text(
        ':',
        style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
      ),
    );
  }

  Widget _buildCategoryTabs() {
    if (_categoryNames.isEmpty) return const SizedBox.shrink();

    return Container(
      height: 48,
      color: Theme.of(context).colorScheme.surface,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        itemCount: _categoryNames.length,
        itemBuilder: (context, index) {
          final isSelected = _selectedCategoryIndex == index;
          return GestureDetector(
            onTap: () => _onCategorySelected(index),
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 4),
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: isSelected ? const Color(0xFFFF2424) : Colors.grey[200],
                borderRadius: BorderRadius.circular(20),
              ),
              alignment: Alignment.center,
              child: Text(
                _categoryNames[index],
                style: TextStyle(
                  color: isSelected ? Colors.white : Colors.black87,
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildProductCard(Map<String, dynamic> item) {
    final product = item['product'] as Map<String, dynamic>? ?? {};
    final variant = item['variant'] as Map<String, dynamic>?;

    final productName = product['name']?.toString() ?? '';
    final displayName = variant != null
        ? '$productName - ${variant['variant_name'] ?? ''}'
        : productName;

    final imageUrl = variant?['image_url'] != null
        ? NetworkUtils.fixDeviceUrl(variant!['image_url'].toString())
        : product['main_image_url'] != null
            ? NetworkUtils.fixDeviceUrl(product['main_image_url'].toString())
            : '';

    final flashSalePrice = double.tryParse(item['flash_sale_price']?.toString() ?? '0') ?? 0;
    final originalPrice = variant != null
        ? double.tryParse(variant['price']?.toString() ?? '0') ?? 0
        : 0.0;

    final discountPercent = originalPrice > flashSalePrice && originalPrice > 0
        ? ((1 - flashSalePrice / originalPrice) * 100).round()
        : 0;

    final soldQuantity = (item['sold_quantity'] as num?)?.toInt() ?? 0;
    final quantityLimit = (item['quantity_limit'] as num?)?.toInt() ?? 100;
    final double progressPercent = quantityLimit > 0
        ? (soldQuantity / quantityLimit * 100).clamp(0.0, 100.0)
        : 0.0;
    final isHot = progressPercent > 75;

    return GestureDetector(
      onTap: () => _navigateToProduct(item),
      child: Container(
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Theme.of(context).colorScheme.outline, width: 0.5),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Khối ảnh sản phẩm + Tag giảm giá ở góc phải
            Stack(
              children: [
                AspectRatio(
                  aspectRatio: 1,
                  child: ClipRRect(
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(8)),
                    child: imageUrl.isNotEmpty
                        ? Image.network(
                            imageUrl,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => _buildPlaceholder(),
                          )
                        : _buildPlaceholder(),
                  ),
                ),
                if (discountPercent > 0)
                  Positioned(
                    top: 0,
                    right: 0,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
                      decoration: const BoxDecoration(
                        color: Colors.orange, // Màu cam nhãn giảm giá chuẩn như ảnh
                        borderRadius: BorderRadius.only(
                          bottomLeft: Radius.circular(8),
                          topRight: Radius.circular(8),
                        ),
                      ),
                      child: Text(
                        '-$discountPercent%',
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.onSecondary,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            
            // Khối chi tiết sản phẩm thông tin
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Tên sản phẩm giới hạn 2 dòng
                    Text(
                      displayName,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: Theme.of(context).colorScheme.onSurface,
                        height: 1.3,
                      ),
                    ),
                    
                    // Gom nhóm giá tiền
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (originalPrice > 0)
                          Text(
                            '${_formatPrice(originalPrice)}đ',
                            style: const TextStyle(
                              fontSize: 11,
                              color: Colors.grey,
                              decoration: TextDecoration.lineThrough,
                            ),
                          ),
                        const SizedBox(height: 1),
                        Text(
                          '${_formatPrice(flashSalePrice)}đ',
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFFFF2424),
                          ),
                        ),
                      ],
                    ),
                    
                    // Thanh Tiến độ số lượng đã bán lồng Chữ thông báo (Y hệt như hình vẽ)
                    _buildProgressBar(progressPercent, isHot, soldQuantity),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPlaceholder() {
    return Container(
      color: Colors.grey[100],
      child: const Center(
        child: Icon(Icons.image_not_supported_outlined, color: Colors.grey, size: 35),
      ),
    );
  }

  Widget _buildProgressBar(double percent, bool isHot, int sold) {
    return Row(
      children: [
        Expanded(
          child: Stack(
            alignment: Alignment.centerLeft,
            children: [
              // Thanh nền màu nhạt phía sau
              Container(
                height: 14,
                decoration: BoxDecoration(
                  color: const Color(0xFFFFE4E4),
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              // Thanh tiến trình chạy thực tế màu đỏ đậm rực rỡ
              FractionallySizedBox(
                widthFactor: percent / 100 == 0 ? 0.08 : percent / 100,
                child: Container(
                  height: 14,
                  decoration: BoxDecoration(
                    color: const Color(0xFFFF2424),
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
              // Chữ nhãn hiển thị trạng thái nằm đè lên thanh tiến trình
              Positioned(
                left: 6,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(3),
                  ),
                  child: Text(
                    isHot ? 'SẮP HẾT HÀNG' : 'VỪA MỞ BÁN',
                    style: const TextStyle(
                      color: Color(0xFFFF2424),
                      fontSize: 8,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 6),
        // Số lượng thực tế đã bán bên phải thanh tiến độ giống hình
        Text(
          'Đã bán $sold',
          style: TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.w500,
            color: Colors.grey[600],
          ),
        ),
      ],
    );
  }
}