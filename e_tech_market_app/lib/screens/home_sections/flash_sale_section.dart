import 'dart:async';
import 'package:flutter/material.dart';
import '../../services/flash_sale_service.dart';
import '../../utils/network_utils.dart';
import '../../utils/translation.dart';

class FlashSaleSection extends StatefulWidget {
  final VoidCallback onViewAll;
  final ValueChanged<Map<String, dynamic>> onFlashSaleItemSelected;
  final ValueChanged<Map<String, dynamic>> onAddToCart;

  const FlashSaleSection({
    super.key,
    required this.onViewAll,
    required this.onFlashSaleItemSelected,
    required this.onAddToCart,
  });

  @override
  State<FlashSaleSection> createState() => _FlashSaleSectionState();
}

class _FlashSaleSectionState extends State<FlashSaleSection> {
  Map<String, dynamic>? _flashSale;
  bool _isLoading = true;
  bool _isCurrentlyActive = false;
  int _hours = 0;
  int _minutes = 0;
  int _seconds = 0;
  Timer? _timer;
  int _startIndex = 0;
  int _tickCount = 0;

  @override
  void initState() {
    super.initState();
    _loadFlashSale();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _loadFlashSale() async {
    try {
      final data = await FlashSaleService.fetchCurrentFlashSale();
      if (!mounted) return;

      setState(() {
        _flashSale = data;
        _isLoading = false;
      });

      if (data != null) {
        _updateActiveStatus();
        _startCountdown();
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
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

        _tickCount++;
        if (_tickCount >= 30) {
          _tickCount = 0;
          final allItems = (_flashSale?['items'] as List<dynamic>?)
                  ?.where((item) => item != null && item['product'] != null)
                  .toList() ?? [];
          if (allItems.isNotEmpty) {
            _startIndex = (_startIndex + 5) % allItems.length;
          }
        }

        setState(() {
          _isCurrentlyActive = true;
          _hours = h;
          _minutes = m;
          _seconds = s;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) return const SizedBox.shrink();

    final allItems = (_flashSale?['items'] as List<dynamic>?)
            ?.where((item) => item != null && item['product'] != null)
            .toList() ??
        [];

    if (!_isCurrentlyActive || allItems.isEmpty) {
      return const SizedBox.shrink();
    }

    final List<dynamic> items = [];
    for (int i = 0; i < 5; i++) {
      if (i < allItems.length) {
        items.add(allItems[(_startIndex + i) % allItems.length]);
      }
    }

    return Container(
      width: double.infinity,
      color: Theme.of(context).colorScheme.surface,
      child: Column(
        children: [
          _buildHeader(),
          _buildProductGrid(items),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.flash_on, color: Color(0xFFFF2424), size: 28),
                  const SizedBox(width: 6),
                  Text(
                    'FLASH SALE',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Theme.of(context).colorScheme.onSurface,
                    ),
                  ),
                ],
              ),
              TextButton(
                onPressed: widget.onViewAll,
                style: TextButton.styleFrom(
                  foregroundColor: const Color(0xFFFF2424),
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                ),
                child: Row(
                  children: [
                    Text(Trans.viewAll, style: TextStyle(fontSize: 14)),
                    Icon(Icons.arrow_forward, size: 16),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 6), // Khoảng cách giữa 2 tầng
          _buildCountdown(), // Khối này giờ có trọn vẹn chiều ngang nên không sợ tràn nữa
        ],
      ),
    );
  }

  Widget _buildCountdown() {
    return Row(
      children: [
        Text(
          'KẾT THÚC TRONG: ',
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
        _buildTimerBox(_hours),
        _buildTimerSep(),
        _buildTimerBox(_minutes),
        _buildTimerSep(),
        _buildTimerBox(_seconds),
      ],
    );
  }

  Widget _buildTimerBox(int value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: const Color(0xFFFF2424),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        value.toString().padLeft(2, '0'),
        style: const TextStyle(
          color: Colors.white,
          fontSize: 12,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Widget _buildTimerSep() {
    return const Padding(
      padding: EdgeInsets.symmetric(horizontal: 2),
      child: Text(
        ':',
        style: TextStyle(
          color: Color(0xFFFF2424),
          fontSize: 14,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Widget _buildProductGrid(List<dynamic> items) {
    return SizedBox(
      height: 300,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: items.length,
        itemBuilder: (context, index) {
          final Map<String, dynamic> item = items[index] as Map<String, dynamic>;
          return _FlashSaleCard(
            item: item,
            onTap: () {
              // Truyền toàn bộ item (chứa product, variant, flash_sale_price)
              widget.onFlashSaleItemSelected(item);
            },
            onAddToCart: () => widget.onAddToCart(item),
          );
        },
      ),
    );
  }
}

class _FlashSaleCard extends StatelessWidget {
  final Map<String, dynamic> item;
  final VoidCallback onTap;
  final VoidCallback onAddToCart;

  const _FlashSaleCard({
    required this.item,
    required this.onTap,
    required this.onAddToCart,
  });

  @override
  Widget build(BuildContext context) {
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

    final discountPercent =
        originalPrice > flashSalePrice && originalPrice > 0
            ? ((1 - flashSalePrice / originalPrice) * 100).round()
            : 0;

    final soldQuantity = (item['sold_quantity'] as num?)?.toInt() ?? 0;
    final quantityLimit = (item['quantity_limit'] as num?)?.toInt() ?? 100;
    final double progressPercent = quantityLimit > 0
        ? (soldQuantity / quantityLimit * 100).clamp(0.0, 100.0)
        : 0.0;
    final isHot = progressPercent > 80;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 155, 
        margin: const EdgeInsets.symmetric(horizontal: 6, vertical: 8),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(5),
          border: Border.all(color: Theme.of(context).colorScheme.outline, width: 0.5),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 8,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Khu vực hình ảnh + Tag giảm giá
            Stack(
              children: [
                AspectRatio(
                  aspectRatio: 1,
                  child: ClipRRect(
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(5)),
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
                    top: 8,
                    left: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFF2424),
                        borderRadius: BorderRadius.circular(6), // Bo góc nhẹ cho Tag
                      ),
                      child: Text(
                        '-$discountPercent%',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            
            // 2. Khu vực thông tin sản phẩm
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(10), // Tăng padding lên 10 cho thoáng
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween, // Đẩy progress bar xuống đáy card
                  children: [
                    // Tên sản phẩm
                    Text(
                      displayName,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 13, // Tăng lên 13 cho dễ đọc
                        fontWeight: FontWeight.w600,
                        color: Theme.of(context).colorScheme.onSurface,
                        height: 1.3,
                      ),
                    ),
                    
                    // Giá tiền và Progress Bar gom vào cụm dưới
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${_formatPrice(flashSalePrice)}đ',
                            style: TextStyle(
                              fontSize: 15, // Tăng size giá để làm điểm nhấn thị giác
                              fontWeight: FontWeight.w900, // Tăng độ đậm lên mức cao nhất
                              color: Color(0xFFFF2424),
                            ),
                          ),
                        const SizedBox(height: 8),
                        _buildProgressBar(context, progressPercent, isHot, soldQuantity),
                      ],
                    ),
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
        child: Icon(Icons.image_not_supported_outlined, color: Colors.grey, size: 30),
      ),
    );
  }

  Widget _buildProgressBar(BuildContext context, double percent, bool isHot, int sold) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Thanh tiến trình chính
        Container(
          height: 8, // Tăng từ 6 lên 8 nhìn sẽ rõ ràng hơn
          decoration: BoxDecoration(
            color: Colors.grey[200],
            borderRadius: BorderRadius.circular(4),
          ),
          child: FractionallySizedBox(
            alignment: Alignment.centerLeft,
            widthFactor: percent / 100 == 0 ? 0.05 : percent / 100, // Nếu vừa mở bán vẫn cho một chút màu sinh động
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient( // Dùng Gradient nhìn cao cấp hơn màu bệt
                  colors: isHot 
                      ? [const Color(0xFFFF2424), const Color(0xFFFF6B6B)]
                      : [const Color(0xFFFF7A45), const Color(0xFFFFBB96)],
                ),
                borderRadius: BorderRadius.circular(4),
              ),
            ),
          ),
        ),
        const SizedBox(height: 4),
        // Chữ trạng thái số lượng đã bán
        Text(
          Trans.soldCount(sold),
          style: TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.w500,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }

  String _formatPrice(double price) {
    return price.toStringAsFixed(0).replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (match) => '${match[1]}.',
        );
  }
}