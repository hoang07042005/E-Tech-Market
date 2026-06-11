import 'package:flutter/material.dart';
import 'package:e_tech_market_app/services/admin_products_service.dart';
import '../../../utils/translation.dart';
import 'admin_product_from_screen.dart';
import 'admin_product_variant_detail_screen.dart';
import '../../../config/api_config.dart';

class AdminProductScreen extends StatefulWidget {
  const AdminProductScreen({super.key});

  @override
  State<AdminProductScreen> createState() => _AdminProductScreenState();
}

class _AdminProductScreenState extends State<AdminProductScreen> {
  List<dynamic> _allProducts = [];
  List<dynamic> _filteredProducts = [];
  List<dynamic> _pagedProducts = [];
  bool _isLoading = true;
  String? _error;

  // Trạng thái bộ lọc
  final TextEditingController _searchController = TextEditingController();
  String _selectedCategory = 'all';
  String _selectedBrand = 'all';
  String _selectedStatus = 'all';

  List<Map<String, dynamic>> _categories = [];
  List<String> _brands = [];

  // Thống kê
  int _totalProducts = 0;
  int _outOfStock = 0;
  int _lowStock = 0;
  int _activeProducts = 0;

  // Phân trang
  static const int _pageSize = 999; // Hiển thị hết tất cả sản phẩm (không giới hạn)
  int _currentPage = 1;
  int _totalPages = 1;

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  // Tải dữ liệu từ API
  Future<void> _fetchData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final data = await AdminProductsService.fetchAdminProducts();
      if (mounted) {
        setState(() {
          _allProducts = data;
          _buildFilterOptions();
          _calculateStats();
          _applyFilters();
          _isLoading = false;
        });
      }
    } catch (err) {
      if (mounted) {
        setState(() {
          _error = err.toString();
          _isLoading = false;
        });
      }
    }
  }

  void _buildFilterOptions() {
    final Map<int, String> categoryMap = {};
    final Set<String> brandSet = {};

    for (var p in _allProducts) {
      if (p['category'] != null && p['category']['id'] != null && p['category']['name'] != null) {
        categoryMap[p['category']['id']] = p['category']['name'].toString();
      }
      final String brand = (p['brand'] ?? '').toString().trim();
      if (brand.isNotEmpty) {
        brandSet.add(brand);
      }
    }

    _categories = categoryMap.entries.map((e) => {'id': e.key.toString(), 'name': e.value}).toList();
    _categories.sort((a, b) => a['name'].compareTo(b['name']));

    _brands = brandSet.toList();
    _brands.sort((a, b) => a.compareTo(b));
  }

  int _getTotalStock(dynamic p) {
    final List<dynamic> variants = p['variants'] ?? [];
    int sum = 0;
    for (var v in variants) {
      final int stock = int.tryParse(v['stock_quantity']?.toString() ?? '0') ?? 0;
      if (stock > 0) sum += stock;
    }
    return sum;
  }

  void _calculateStats() {
    _totalProducts = _allProducts.length;
    _activeProducts = _allProducts.where((p) => p['is_active'] == true).length;
    
    _outOfStock = 0;
    _lowStock = 0;

    for (var p in _allProducts) {
      final stock = _getTotalStock(p);
      if (stock <= 0) {
        _outOfStock++;
      } else if (stock < 10) {
        _lowStock++;
      }
    }
  }

  void _applyFilters() {
    final query = _searchController.text.trim().toLowerCase();

    _filteredProducts = _allProducts.where((p) {
      if (_selectedCategory != 'all' && p['category_id']?.toString() != _selectedCategory) {
        return false;
      }
      if (_selectedBrand != 'all' && (p['brand'] ?? '').toString().trim() != _selectedBrand) {
        return false;
      }
      if (_selectedStatus != 'all') {
        final bool isActive = p['is_active'] == true;
        if (_selectedStatus == 'active' && !isActive) return false;
        if (_selectedStatus == 'inactive' && isActive) return false;
      }
      if (query.isNotEmpty) {
        final String name = (p['name'] ?? '').toString().toLowerCase();
        final String brand = (p['brand'] ?? '').toString().toLowerCase();
        final String catName = (p['category']?['name'] ?? '').toString().toLowerCase();
        final String haystack = '$name $brand $catName';
        if (!haystack.contains(query)) return false;
      }
      return true;
    }).toList();

    _totalPages = (_filteredProducts.length / _pageSize).ceil();
    if (_totalPages < 1) _totalPages = 1;
    if (_currentPage > _totalPages) _currentPage = _totalPages;

    final int start = (_currentPage - 1) * _pageSize;
    final int end = start + _pageSize;

    _pagedProducts = _filteredProducts.sublist(
      start,
      end > _filteredProducts.length ? _filteredProducts.length : end,
    );
  }

  void _clearFilters() {
    _searchController.clear();
    setState(() {
      _selectedCategory = 'all';
      _selectedBrand = 'all';
      _selectedStatus = 'all';
      _currentPage = 1;
      _applyFilters();
    });
  }

  String _resolveImageUrl(String? url) {
    if (url == null || url.isEmpty) return '';
    
    const String serviceUrl = String.fromEnvironment('API_BASE_URL', defaultValue: ApiConfig.apiBaseUrl);
    final String domain = serviceUrl.replaceAll('/api', '');

    if (url.startsWith('http')) {
      if (url.contains('localhost:8000')) {
        return url.replaceAll('http://localhost:8000', domain);
      }
      return url;
    }
    return '$domain${url.startsWith('/') ? url : '/$url'}';
  }

  void _handleDeleteProduct(dynamic product) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            const Icon(Icons.warning_amber_rounded, color: Colors.redAccent),
            const SizedBox(width: 8),
            Text(Trans.confirmDelete, style: const TextStyle(fontWeight: FontWeight.bold)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(Trans.deleteWarning),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Theme.of(context).colorScheme.outline, width: 0.5),
              ),
              child: Row(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      width: 48,
                      height: 48,
                      color: Theme.of(context).colorScheme.surface,
                      child: product['main_image_url'] != null
                          ? Image.network(_resolveImageUrl(product['main_image_url']), fit: BoxFit.cover)
                          : const Icon(Icons.image, color: Colors.grey),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(product['name'] ?? '', maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface)),
                        Text(product['brand'] ?? Trans.brandEmpty, style: TextStyle(color: Colors.grey[600], fontSize: 12)),
                      ],
                    ),
                  )
                ],
              ),
            )
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: Text(Trans.cancel, style: const TextStyle(color: Colors.grey))),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await AdminProductsService.deleteAdminProduct(product['id']);
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(Trans.deletedSuccess), backgroundColor: Colors.green),
                  );
                }
                _fetchData();
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('${Trans.errorPrefix}$e'), backgroundColor: Colors.red),
                  );
                }
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent, elevation: 0),
            child: Text(Trans.delete, style: const TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Theme.of(context).colorScheme.surface,
        foregroundColor: Theme.of(context).colorScheme.onSurface,
        title: Text(Trans.productList, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.blueAccent),
            onPressed: _fetchData,
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => const AdminProductFormScreen()),
          ).then((_) => _fetchData()); 
        },
        icon: const Icon(Icons.add, color: Colors.white),
        label: Text(Trans.addNew, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
        backgroundColor: const Color(0xFFF26522),
        elevation: 2,
      ),
      body: RefreshIndicator(
        onRefresh: _fetchData,
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error_outline, size: 48, color: Colors.redAccent),
                        const SizedBox(height: 12),
                        Text(_error!, style: const TextStyle(color: Colors.red), textAlign: TextAlign.center),
                      ],
                    ),
                  )
                : CustomScrollView(
                    slivers: [
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                          child: _buildStatsGrid(),
                        ),
                      ),
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          child: _buildFiltersCard(),
                        ),
                      ),
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(20, 12, 16, 8),
                          child: Text(
                            '${Trans.searchResults} (${_filteredProducts.length})',
                            style: TextStyle(color: Colors.grey[700], fontWeight: FontWeight.bold, fontSize: 14),
                          ),
                        ),
                      ),
                      _pagedProducts.isEmpty
                          ? SliverToBoxAdapter(
                              child: Padding(
                                padding: const EdgeInsets.symmetric(vertical: 60),
                                child: Center(child: Text(Trans.noMatchingProducts, style: const TextStyle(color: Colors.grey))),
                              ),
                            )
                          : SliverList(
                              delegate: SliverChildBuilderDelegate(
                                (context, index) => _buildProductItem(_pagedProducts[index]),
                                childCount: _pagedProducts.length,
                              ),
                            ),
                      if (_filteredProducts.isNotEmpty && _totalPages > 1)
                        SliverToBoxAdapter(child: _buildPaginationBar()),
                      const SliverToBoxAdapter(child: SizedBox(height: 90)),
                    ],
                  ),
      ),
    );
  }

  Widget _buildStatsGrid() {
    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      childAspectRatio: 1.6,
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      children: [
        _buildStatCard(Trans.totalProducts, _totalProducts.toString(), Icons.layers, const Color(0xFFE0F2FE), const Color(0xFF0369A1)),
        _buildStatCard(Trans.outOfStock, _outOfStock.toString(), Icons.label_off, const Color(0xFFFFE4E6), const Color(0xFFB91C1C)),
        _buildStatCard(Trans.lowStock, _lowStock.toString(), Icons.warning, const Color(0xFFFEF3C7), const Color(0xFFB45309)),
        _buildStatCard(Trans.activeProducts, _activeProducts.toString(), Icons.check_circle, const Color(0xFFDCFCE7), const Color(0xFF15803D)),
      ],
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon, Color bgColor, Color textColor) {
    return Container(
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: textColor.withOpacity(0.12), width: 1),
      ),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label, style: TextStyle(fontSize: 12, color: textColor.withOpacity(0.8), fontWeight: FontWeight.w600)),
              Icon(icon, color: textColor.withOpacity(0.7), size: 20),
            ],
          ),
          Text(value, style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: textColor)),
        ],
      ),
    );
  }

  Widget _buildFiltersCard() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(5),
        border: Border.all(color: Theme.of(context).colorScheme.outline, width: 0.5),
      ),
      child: Column(
        children: [
          TextField(
            controller: _searchController,
            decoration: InputDecoration(
              hintText: Trans.searchByNameBrand,
              prefixIcon: const Icon(Icons.search, size: 22, color: Colors.grey),
              filled: true,
              fillColor: Theme.of(context).colorScheme.surface,
              contentPadding: const EdgeInsets.symmetric(vertical: 0),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(5), borderSide: BorderSide(color: Theme.of(context).colorScheme.onSurface, width: 0.5)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(5), borderSide: BorderSide(color: Theme.of(context).colorScheme.onSurface, width: 0.5)),
            ),
            onChanged: (v) {
              setState(() {
                _currentPage = 1;
                _applyFilters();
              });
            },
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  value: _selectedCategory,
                  isExpanded: true,
                  decoration: InputDecoration(
                    labelText: Trans.category,
                    filled: true,
                    fillColor: Theme.of(context).colorScheme.surface,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(5), borderSide: BorderSide(color: Theme.of(context).colorScheme.onSurface, width: 0.5)),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(5), borderSide: BorderSide(color: Theme.of(context).colorScheme.onSurface, width: 0.5)),
                  ),
                  items: [
                    DropdownMenuItem(value: 'all', child: Text(Trans.all, style: const TextStyle(fontSize: 13))),
                    ..._categories.map((c) => DropdownMenuItem(
                          value: c['id'],
                          child: Text(c['name'], overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13)),
                        ))  
                  ],
                  onChanged: (val) {
                    setState(() {
                      _selectedCategory = val!;
                      _currentPage = 1;
                      _applyFilters();
                    });
                  },
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: DropdownButtonFormField<String>(
                  value: _selectedBrand,
                  isExpanded: true,
                  decoration: InputDecoration(
                    labelText: Trans.brand,
                    filled: true,
                    fillColor: Theme.of(context).colorScheme.surface,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(5), borderSide: BorderSide(color: Theme.of(context).colorScheme.onSurface, width: 0.5)),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(5), borderSide: BorderSide(color: Theme.of(context).colorScheme.onSurface, width: 0.5)),
                  ),
                  items: [
                    DropdownMenuItem(value: 'all', child: Text(Trans.all, style: const TextStyle(fontSize: 13))),
                    ..._brands.map((b) => DropdownMenuItem(
                          value: b,
                          child: Text(b, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13)),
                        ))
                  ],
                  onChanged: (val) {
                    setState(() {
                      _selectedBrand = val!;
                      _currentPage = 1;
                      _applyFilters();
                    });
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  value: _selectedStatus,
                  isExpanded: true,
                  decoration: InputDecoration(

                    labelText: Trans.displayStatus,
                    filled: true,
                    fillColor: Theme.of(context).colorScheme.surface,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(5), borderSide: BorderSide(color: Theme.of(context).colorScheme.onSurface, width: 0.5)),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(5), borderSide: BorderSide(color: Theme.of(context).colorScheme.onSurface, width: 0.5)),
                  ),
                  items: [
                    DropdownMenuItem(value: 'all', child: Text(Trans.allStatuses, style: const TextStyle(fontSize: 13))),
                    DropdownMenuItem(value: 'active', child: Text(Trans.displaying, style: const TextStyle(fontSize: 13))),
                    DropdownMenuItem(value: 'inactive', child: Text(Trans.hidden, style: const TextStyle(fontSize: 13))),
                  ],
                  onChanged: (val) {
                    setState(() {
                      _selectedStatus = val!;
                      _currentPage = 1;
                      _applyFilters();
                    });
                  },
                ),
              ),
              const SizedBox(width: 8),
              TextButton.icon(
                onPressed: _clearFilters,
                icon: const Icon(Icons.refresh_sharp, size: 18),
                label: Text(Trans.reset, style: const TextStyle(fontSize: 13)),
                style: TextButton.styleFrom(foregroundColor: Colors.redAccent),
              )
            ],
          )
        ],
      ),
    );
  }

  Widget _buildProductItem(dynamic p) {
    final int totalStock = _getTotalStock(p);
    final double pct = (totalStock / 200).clamp(0.0, 1.0);
    final Color progressColor = pct >= 0.6 ? Colors.green : pct >= 0.3 ? Colors.orange : Colors.red;
    final bool isActive = p['is_active'] == true;
    final String shortDescription = p['description'] ?? Trans.noShortDescription;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(5),
        border: Border.all(color: Theme.of(context).colorScheme.onSurface, width: 0.5),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Ảnh sản phẩm
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: Colors.grey[50],
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Theme.of(context).colorScheme.onSurface, width: 0.5),
                  ),
                  child: p['main_image_url'] != null
                      ? ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: Image.network(
                            _resolveImageUrl(p['main_image_url']),
                            fit: BoxFit.cover,
                            errorBuilder: (c, e, s) => const Icon(Icons.broken_image_outlined, color: Colors.grey, size: 28),
                          ),
                        )
                      : const Icon(Icons.image_outlined, color: Colors.grey, size: 28),
                ),
                const SizedBox(width: 12),
                
                // Sử dụng Stack để Tag Trạng Thái có thể hiển thị NỔI ĐÈ LÊN TRÊN
                Expanded(
                  child: Stack(
                    clipBehavior: Clip.none,
                    children: [
                      // Toàn bộ khối thông tin text thông thường bên dưới
                      Padding(
                        padding: const EdgeInsets.only(top: 2), // Tạo một chút khoảng đệm phía trên
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Tên sản phẩm chiếm trọn chiều rộng dòng (nếu text dài, tag đè lên góc phải trên của text)
                            Padding(
                              padding: const EdgeInsets.only(right: 65), // Tránh đè trực tiếp lên chữ đầu tiên của Tên
                              child: Text(
                                p['name'] ?? Trans.noName,
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Theme.of(context).colorScheme.onSurface),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const SizedBox(height: 6),
                            
                            // Mô tả ngắn nằm ngay dưới tên sản phẩm
                            Text(
                              shortDescription,
                              style: TextStyle(fontSize: 12, color: Colors.grey[500], height: 1.3),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 6),
                            
                            // Dòng thông tin thương hiệu và danh mục
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(color: Colors.blue.withOpacity(0.06), borderRadius: BorderRadius.circular(4)),
                                  child: Text(p['brand'] ?? 'Generic', style: const TextStyle(fontSize: 11, color: Colors.blue, fontWeight: FontWeight.bold)),
                                ),
                                const SizedBox(width: 6),
                                Flexible(
                                  child: Text(
                                    p['category']?['name'] ?? Trans.uncategorized,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      
                      // TAG ĐANG BÁN / TẠM ẨN: Hiển thị NỔI đè hoàn toàn lên trên góc phải
                      Positioned(
                        right: 0,
                        top: 0,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                          decoration: BoxDecoration(
                            color: isActive ? Colors.green.withOpacity(0.12) : Colors.grey.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(6),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.02),
                                blurRadius: 2,
                                offset: const Offset(0, 1),
                              )
                            ],
                          ),
                          child: Text(
                            isActive ? Trans.selling : Trans.temporarilyHidden,
                            style: TextStyle(
                              color: isActive ? Colors.green[700] : Colors.grey[700], 
                              fontSize: 9, 
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const Divider(height: 20, thickness: 0.5),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('${Trans.stock}: $totalStock ${Trans.productItemsCount}', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Colors.grey[700])),
                        ],
                      ),
                      const SizedBox(height: 4),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: pct,
                          backgroundColor: Colors.grey[100],
                          valueColor: AlwaysStoppedAnimation<Color>(progressColor),
                          minHeight: 5,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 24),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _buildActionButton(Icons.remove_red_eye_outlined, Colors.blue, () {Navigator.push(context,MaterialPageRoute(builder: (context) => AdminProductVariantDetailScreen(productId: p['id']),),);}),                    const SizedBox(width: 4),
                    const SizedBox(width: 4),
                    _buildActionButton(
                        Icons.edit_outlined,
                        Colors.orange,
                        () async {
                            final bool? isUpdated = await Navigator.push<bool>(
                            context,
                            MaterialPageRoute(
                                builder: (context) => AdminProductFormScreen(
                                productId: p['id'],
                                ),
                            ),
                            );
                            if (isUpdated == true) {
                            _fetchData();
                            }
                        },
                    ),
                    const SizedBox(width: 4),
                    _buildActionButton(Icons.delete_outline_outlined, Colors.redAccent, () => _handleDeleteProduct(p)),
                  ],
                )
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButton(IconData icon, Color color, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(color: color.withOpacity(0.08), borderRadius: BorderRadius.circular(8)),
        child: Icon(icon, color: color, size: 18),
      ),
    );
  }

  Widget _buildPaginationBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            '${Trans.page} $_currentPage / $_totalPages',
            style: TextStyle(color: Colors.grey[600], fontSize: 13, fontWeight: FontWeight.w500),
          ),
          Row(
            children: [
              OutlinedButton(
                onPressed: _currentPage > 1
                    ? () {
                        setState(() {
                          _currentPage--;
                          _applyFilters();
                        });
                      }
                    : null,
                style: OutlinedButton.styleFrom(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
                child: Text(Trans.previous),
              ),
              const SizedBox(width: 8),
              OutlinedButton(
                onPressed: _currentPage < _totalPages
                    ? () {
                        setState(() {
                          _currentPage++;
                          _applyFilters();
                        });
                      }
                    : null,
                style: OutlinedButton.styleFrom(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
                child: Text(Trans.next),
              ),
            ],
          ),
        ],
      ),
    );
  }
}