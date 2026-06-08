import 'package:flutter/material.dart';
import '../../../services/products_service.dart';
import '../../../utils/network_utils.dart';
import '../../../utils/app_snackbar.dart';

class AdminInventoryScreen extends StatefulWidget {
  const AdminInventoryScreen({super.key});

  @override
  State<AdminInventoryScreen> createState() => _AdminInventoryScreenState();
}

class _AdminInventoryScreenState extends State<AdminInventoryScreen> {
  List<dynamic> _inventoryItems = [];
  bool _isLoading = true;
  String _searchQuery = '';
  String _filterStatus = 'all'; // all, low, out
  int _lowStockThreshold = 10; // Ngưỡng động đồng bộ từ Web

  @override
  void initState() {
    super.initState();
    _loadInventory();
  }

  Future<void> _loadInventory() async {
    setState(() => _isLoading = true);
    try {
      final response = await ProductsService.fetchProducts(limit: 100);
      int threshold = 10; 

      if (mounted) {
        final List<dynamic> products = response['data'] ?? [];
        List<dynamic> flatInventory = [];

        for (var p in products) {
          final List<dynamic> variants = p['variants'] ?? [];
          
          if (variants.isEmpty) {
            flatInventory.add({
              'id': p['id'],
              'is_variant': false,
              'product_name': p['name'] ?? '—',
              'variant_name': null,
              'sku': p['sku'],
              'price': p['price']?.toString(),
              'stock_quantity': p['stock_quantity'] != null ? int.tryParse(p['stock_quantity'].toString()) : null,
              'main_image_url': p['main_image_url'],
            });
          } else {
            for (var v in variants) {
              final String? variantImage = v['image_url'] ?? v['variant_image_url'] ?? p['main_image_url'];

              flatInventory.add({
                'id': v['id'],
                'is_variant': true,
                'product_name': p['name'] ?? '—',
                'variant_name': v['variant_name'] ?? '',
                'sku': v['sku'] ?? p['sku'],
                'price': v['price']?.toString() ?? p['price']?.toString(),
                'stock_quantity': v['stock_quantity'] != null ? int.tryParse(v['stock_quantity'].toString()) : null,
                'main_image_url': variantImage, 
              });
            }
          }
        }

        setState(() {
          _inventoryItems = flatInventory;
          _lowStockThreshold = threshold;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        AppSnackBar.showError(context, 'Không thể tải dữ liệu tồn kho');
      }
    }
  }

  Future<void> _restockItem(int id, bool isVariant, int amount) async {
    try {
      await ProductsService.restock(
        id: id, 
        isVariant: isVariant, 
        amount: amount,
      );

      if (mounted) {
        AppSnackBar.showSuccess(context, 'Đã cập nhật số lượng tồn kho thành công!');
        _loadInventory();
      }
    } catch (e) {
      debugPrint('==> LỖI HIỂN THỊ TRÊN MÀN HÌNH: $e');
      if (mounted) {
        final cleanErrorMessage = e.toString().replaceAll('Exception: ', '');
        AppSnackBar.showError(context, 'Cập nhật thất bại: $cleanErrorMessage');
      }
    }
  }

  // --- GETTERS TÍNH TOÁN SỐ LƯỢNG SẢN PHẨM CHO TỪNG BỘ LỌC (Không phụ thuộc vào thanh tìm kiếm) ---
  int get _countAll => _inventoryItems.length;

  int get _countLowStock {
    return _inventoryItems.where((item) {
      final stock = (item['stock_quantity'] ?? 0) as int;
      return stock > 0 && stock <= _lowStockThreshold;
    }).length;
  }

  int get _countOutStock {
    return _inventoryItems.where((item) {
      final stock = (item['stock_quantity'] ?? 0) as int;
      return stock <= 0;
    }).length;
  }

  List<dynamic> get _filteredItems {
    return _inventoryItems.where((item) {
      final productName = (item['product_name'] ?? '').toLowerCase();
      final variantName = (item['variant_name'] ?? '').toLowerCase();
      final sku = (item['sku'] ?? '').toLowerCase();
      
      final matchesSearch = productName.contains(_searchQuery.toLowerCase()) || 
                            variantName.contains(_searchQuery.toLowerCase()) ||
                            sku.contains(_searchQuery.toLowerCase());
      
      final stock = (item['stock_quantity'] ?? 0) as int;
      if (_filterStatus == 'low') {
        return matchesSearch && stock > 0 && stock <= _lowStockThreshold;
      } else if (_filterStatus == 'out') {
        return matchesSearch && stock <= 0;
      }
      return matchesSearch;
    }).toList();
  }

  Color _getStatusColor(int stock) {
    if (stock <= 0) return const Color(0xFFEF4444);
    if (stock <= _lowStockThreshold) return const Color(0xFFF97316);
    return const Color(0xFF10B981);
  }

  String _getStatusText(int stock) {
    if (stock <= 0) return 'Hết hàng';
    if (stock <= _lowStockThreshold) return 'Sắp hết ($_lowStockThreshold)';
    return 'Sẵn có';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Quản lý tồn kho', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadInventory,
          )
        ],
      ),
      body: Column(
        children: [
          Container(
            color: Colors.white,
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                TextField(
                  onChanged: (val) => setState(() => _searchQuery = val),
                  decoration: InputDecoration(
                    hintText: 'Tìm theo tên, biến thể hoặc SKU...',
                    prefixIcon: const Icon(Icons.search),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                    filled: true,
                    fillColor: const Color(0xFFF1F5F9),
                    isDense: true,
                  ),
                ),
                const SizedBox(height: 12),
                // Bọc trong SingleChildScrollView để tránh tràn màn hình khi kích thước badge dài ra
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildFilterChip('Tất cả', 'all', _countAll),
                      const SizedBox(width: 8),
                      _buildFilterChip('Sắp hết hàng', 'low', _countLowStock),
                      const SizedBox(width: 8),
                      _buildFilterChip('Đã hết hàng', 'out', _countOutStock),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: _isLoading 
              ? const Center(child: CircularProgressIndicator(color: Color(0xFFF26522)))
              : _filteredItems.isEmpty 
                ? _buildEmptyState()
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _filteredItems.length,
                    itemBuilder: (context, index) => _buildInventoryCard(_filteredItems[index]),
                  ),
          ),
        ],
      ),
    );
  }

  // Cập nhật hàm nhận thêm tham số count để hiển thị số lượng badge quả bóng số tròn
  Widget _buildFilterChip(String label, String value, int count) {
    final isSelected = _filterStatus == value;
    return ChoiceChip(
      label: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(label),
          const SizedBox(width: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              // Nếu đang chọn thì nền số màu trắng đục, nếu không chọn thì nền màu xám/cam nhẹ
              color: isSelected 
                  ? Colors.white.withOpacity(0.25) 
                  : (value == 'out' && count > 0 ? const Color(0xFFFEE2E2) : const Color(0xFFF1F5F9)),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              '$count',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                // Đổi màu chữ động theo trạng thái của Tab
                color: isSelected 
                    ? Colors.white 
                    : (value == 'out' && count > 0 ? const Color(0xFFEF4444) : const Color(0xFF475569)),
              ),
            ),
          ),
        ],
      ),
      selected: isSelected,
      onSelected: (selected) {
        if (selected) setState(() => _filterStatus = value);
      },
      selectedColor: const Color(0xFFF26522),
      labelStyle: TextStyle(
        color: isSelected ? Colors.white : const Color(0xFF64748B),
        fontWeight: FontWeight.bold,
        fontSize: 13
      ),
      backgroundColor: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: isSelected ? Colors.transparent : const Color(0xFFE2E8F0)),
      ),
    );
  }

  Widget _buildInventoryCard(Map<String, dynamic> item) {
    final stock = (item['stock_quantity'] ?? 0) as int;
    final imageUrl = item['main_image_url'] != null ? NetworkUtils.fixDeviceUrl(item['main_image_url']) : '';
    final hasVariant = item['variant_name'] != null;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFF1F5F9)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Container(
              width: 80,
              height: 80,
              color: const Color(0xFFF8FAFC),
              child: imageUrl.isEmpty 
                ? const Icon(Icons.image_not_supported_outlined, color: Color(0xFFCBD5E1), size: 30) 
                : Image.network(imageUrl, fit: BoxFit.contain),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item['product_name'] ?? 'Không tên',
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: Color(0xFF1E293B)),
                ),
                if (hasVariant) ...[
                  const SizedBox(height: 2),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      'Phân loại: ${item['variant_name']}',
                      style: const TextStyle(fontSize: 12, color: Color(0xFF475569), fontWeight: FontWeight.w500),
                    ),
                  ),
                ],
                const SizedBox(height: 6),
                Row(
                  children: [
                    const Icon(Icons.qr_code_rounded, size: 14, color: Color(0xFF94A3B8)),
                    const SizedBox(width: 4),
                    Text(
                      item['sku'] ?? 'Chưa cấu hình SKU',
                      style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), fontFamily: 'monospace'),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: _getStatusColor(stock).withOpacity(0.12),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        '${_getStatusText(stock)}: $stock',
                        style: TextStyle(color: _getStatusColor(stock), fontWeight: FontWeight.bold, fontSize: 12),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.add_box_rounded, color: Color(0xFFF26522)),
                      onPressed: () => _showRestockBottomSheet(item),
                    ),
                  ],
                )
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showRestockBottomSheet(Map<String, dynamic> item) {
    final TextEditingController amountController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true, 
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(ctx).viewInsets.bottom,
        ),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 20),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE2E8F0),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const Text(
                'Nhập thêm hàng kho',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Color(0xFF1E293B)),
              ),
              const SizedBox(height: 4),
              Text(
                '${item['product_name']}${item['variant_name'] != null ? " (${item['variant_name']})" : ""}',
                style: const TextStyle(fontSize: 13, color: Color(0xFF64748B), fontWeight: FontWeight.normal),
              ),
              const SizedBox(height: 24),
              TextField(
                controller: amountController,
                keyboardType: TextInputType.number,
                autofocus: true,
                decoration: InputDecoration(
                  labelText: 'Số lượng thêm vào',
                  hintText: 'Ví dụ: 10, 20, 50...',
                  labelStyle: const TextStyle(color: Color(0xFF64748B)),
                  floatingLabelStyle: const TextStyle(color: Color(0xFFF26522)),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFFF26522), width: 2),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFFE2E8F0), width: 1),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => Navigator.pop(ctx),
                    child: const Text('Hủy bỏ', style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () {
                        final int? amount = int.tryParse(amountController.text);
                        if (amount == null || amount <= 0) {
                          AppSnackBar.showError(context, 'Số lượng nhập không hợp lệ');
                          return;
                        }
                        Navigator.pop(ctx);
                        _restockItem(item['id'], item['is_variant'], amount);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFF26522),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        elevation: 0,
                      ),
                      child: const Text('Xác nhận', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Text('Không tìm thấy sản phẩm hoặc biến thể nào.', style: TextStyle(color: Colors.grey.shade500)),
    );
  }
}