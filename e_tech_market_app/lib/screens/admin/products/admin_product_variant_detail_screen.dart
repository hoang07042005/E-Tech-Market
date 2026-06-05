import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:e_tech_market_app/services/admin_products_service.dart';
import 'package:e_tech_market_app/utils/network_utils.dart';

class AdminProductVariantDetailScreen extends StatefulWidget {
  final int productId;
  const AdminProductVariantDetailScreen({super.key, required this.productId});

  @override
  State<AdminProductVariantDetailScreen> createState() => _AdminProductVariantDetailScreenState();
}

class _AdminProductVariantDetailScreenState extends State<AdminProductVariantDetailScreen> {
  late Future<Map<String, dynamic>> _productFuture;
  String _selectedFilter = 'all';

  @override
  void initState() {
    super.initState();
    _productFuture = AdminProductsService.fetchAdminProductDetail(widget.productId);
  }

  String _resolveImageUrl(String? url) {
    if (url == null || url.isEmpty) return '';
    return NetworkUtils.fixDeviceUrl(url);
  }

  String _formatCurrency(dynamic amount) {
    final val = double.tryParse(amount.toString()) ?? 0.0;
    return NumberFormat.currency(locale: 'vi_VN', symbol: '₫').format(val);
  }

  List<String> _getUniqueColors(List variants) {
    return variants
        .map((v) => (v['color'] ?? '').toString().trim())
        .where((c) => c.isNotEmpty)
        .toSet()
        .toList();
  }

  List<String> _getUniqueConfigs(List variants) {
    return variants
        .map((v) => (v['configuration'] ?? '').toString().trim())
        .where((c) => c.isNotEmpty)
        .toSet()
        .toList();
  }

  List<dynamic> _getDisplayedVariants(List variants, String filterType, String selectedFilter) {
    if (selectedFilter == 'all') return variants;
    return variants.where((v) {
      if (filterType == 'color') return (v['color'] ?? '').toString().trim() == selectedFilter;
      if (filterType == 'config') return (v['configuration'] ?? '').toString().trim() == selectedFilter;
      return true;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: FutureBuilder<Map<String, dynamic>>(
        future: _productFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const CircularProgressIndicator(),
                  const SizedBox(height: 16),
                  Text('Đang tải thông số kỹ thuật & phiên bản...', style: TextStyle(color: Colors.grey[700]!)),
                ],
              ),
            );
          }

          if (snapshot.hasError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 48, color: Colors.red),
                  const SizedBox(height: 12),
                  Text('Lỗi: ${snapshot.error}', textAlign: TextAlign.center),
                ],
              ),
            );
          }

          final p = snapshot.data!;
          final List variants = p['variants'] ?? [];
          final List specs = p['specs'] ?? [];
          final List faqs = p['faqs'] ?? [];

          // Calculate analytics
          int totalStock = variants.fold(0, (sum, v) => sum + (int.tryParse(v['stock_quantity']?.toString() ?? '0') ?? 0));
          int activeVariants = variants.where((v) => v['is_active'] == true).length;
          int outOfStockCount = variants.where((v) => (int.tryParse(v['stock_quantity']?.toString() ?? '0') ?? 0) <= 0).length;

          // Price range
          List<double> prices = variants.map<double>((v) {
            double original = double.tryParse(v['price'].toString()) ?? 0.0;
            double effective = v['effective_price'] != null ? double.tryParse(v['effective_price'].toString()) ?? original : original;
            return effective;
          }).toList();

          double minPrice = prices.isNotEmpty ? prices.reduce((a, b) => a < b ? a : b) : double.tryParse(p['price'].toString()) ?? 0.0;
          double maxPrice = prices.isNotEmpty ? prices.reduce((a, b) => a > b ? a : b) : double.tryParse(p['price'].toString()) ?? 0.0;

          // Filter specs
          List generalSpecs = specs.where((s) => s['product_variant_id'] == null).toList();
          List variantSpecificSpecs = specs.where((s) => s['product_variant_id'] != null).toList();

          // Determine filter type
          List<String> colors = _getUniqueColors(variants);
          List<String> configs = colors.isEmpty ? _getUniqueConfigs(variants) : [];
          String filterType = colors.isNotEmpty ? 'color' : (configs.isNotEmpty ? 'config' : 'none');
          List<String> filterItems = filterType == 'color' ? colors : configs;

          List displayedVariants = _getDisplayedVariants(variants, filterType, _selectedFilter);

          return CustomScrollView(
            slivers: [
              // Header
              SliverAppBar(
                backgroundColor: Colors.white,
                elevation: 1,
                pinned: true,
                leading: IconButton(
                  icon: const Icon(Icons.arrow_back, color: Colors.black),
                  onPressed: () => Navigator.pop(context),
                ),
                title: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(p['name'] ?? '', style: const TextStyle(color: Colors.black, fontSize: 16, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(color: Colors.grey[200]!, borderRadius: BorderRadius.circular(4)),
                          child: Text(p['brand'] ?? 'No Brand', style: const TextStyle(fontSize: 10, color: Colors.grey)),
                        ),
                        const SizedBox(width: 8),
                        Text('•', style: TextStyle(color: Colors.grey[400]!)),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(p['category']?['name'] ?? 'Không có danh mục', style: const TextStyle(fontSize: 10, color: Colors.grey), overflow: TextOverflow.ellipsis),
                        ),
                        const SizedBox(width: 8),
                        Text('•', style: TextStyle(color: Colors.grey[400]!)),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: p['is_active'] ? Colors.green[100]! : Colors.red[100]!,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            p['is_active'] ? 'HOẠT ĐỘNG' : 'ẨN',
                            style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: p['is_active'] ? Colors.green[700]! : Colors.red[700]!),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // Content
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Stats Grid (2x2)
                      GridView.count(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        crossAxisCount: 2,
                        childAspectRatio: 1.5,
                        mainAxisSpacing: 12,
                        crossAxisSpacing: 12,
                        children: [
                          _buildStatCard(
                            'Số phiên bản',
                            variants.length.toString(),
                            '$activeVariants/${variants.length} Đang kích hoạt',
                          Icons.inventory_2,
                          Colors.orange,
                        ),
                        _buildStatCard(
                          'Tổng số lượng kho',
                          totalStock.toString(),
                          outOfStockCount > 0 ? '$outOfStockCount phiên bản hết hàng' : 'Tất cả ổn định',
                          Icons.storage,
                            outOfStockCount > 0 ? Colors.red : Colors.green,
                          ),
                          _buildStatCard(
                            'Giá thấp nhất',
                            _formatCurrency(minPrice),
                            'Giá hiệu lực',
                            Icons.attach_money,
                            Colors.blue,
                          ),
                          _buildStatCard(
                            'Giá cao nhất',
                            _formatCurrency(maxPrice),
                            'Giá hiệu lực',
                            Icons.attach_money,
                            Colors.blue,
                          ),
                        ],
                      ),

                      const SizedBox(height: 24),

                      // Variant Filter Tabs
                      if (filterType != 'none') ...[
                        const Text('Chi tiết phiên bản sản phẩm', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 12),
                        SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: Row(
                            children: [
                              _buildFilterTab('all', 'Tất cả (${variants.length})', _selectedFilter),
                              ...filterItems.map((item) {
                                int count = variants.where((v) {
                                  if (filterType == 'color') return (v['color'] ?? '').toString().trim() == item;
                                  return (v['configuration'] ?? '').toString().trim() == item;
                                }).length;
                                return _buildFilterTab(item, '$item ($count)', _selectedFilter);
                              }).toList(),
                            ],
                          ),
                        ),
                        const SizedBox(height: 12),
                      ],

                      // Variants List
                      if (displayedVariants.isEmpty)
                        Container(
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(border: Border.all(color: Colors.grey[300]!), borderRadius: BorderRadius.circular(8)),
                          child: const Text(
                            'Sản phẩm này chưa có bất kỳ phiên bản nào. Vui lòng vào chỉnh sửa sản phẩm để thêm phiên bản.',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: Colors.grey, fontSize: 13),
                          ),
                        )
                      else
                        Column(
                          children: displayedVariants
                              .map<Widget>((v) => _buildDetailedVariantCard(v, variantSpecificSpecs, p['main_image_url']))
                              .toList(),
                        ),

                      const SizedBox(height: 20),

                      // General Specs
                      if (generalSpecs.isNotEmpty) ...[
                        const Divider(height: 24),
                        Row(
                          children: [
                            const Icon(Icons.settings, size: 18),
                            const SizedBox(width: 8),
                            const Text('Thông số kỹ thuật chung', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        const SizedBox(height: 12),
                        _buildGroupedSpecsTable(_groupSpecs(generalSpecs)),
                      ],

                      const SizedBox(height: 20),

                      // Description & FAQs
                      if (p['description'] != null || (faqs.isNotEmpty)) ...[
                        const Divider(height: 24),
                        const Text('Thông tin bổ sung', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 12),
                        if (p['description'] != null) ...[
                          const Text('Mô tả tóm tắt', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.grey)),
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(color: Colors.grey[50]!, borderRadius: BorderRadius.circular(6)),
                            child: Text(p['description'], style: const TextStyle(fontSize: 13, color: Colors.black87)),
                          ),
                          const SizedBox(height: 12),
                        ],
                        if (faqs.isNotEmpty) ...[
                          Text('Câu hỏi thường gặp (${faqs.length})', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.grey)),
                          const SizedBox(height: 8),
                          Column(
                            children: faqs
                                .map((faq) => Container(
                                      margin: const EdgeInsets.only(bottom: 8),
                                      padding: const EdgeInsets.all(12),
                                      decoration: BoxDecoration(border: Border.all(color: Colors.grey[200]!), borderRadius: BorderRadius.circular(6)),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text('Q: ${faq['question']}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.blue)),
                                          const SizedBox(height: 8),
                                          Text('${faq['answer']}', style: const TextStyle(fontSize: 12, color: Colors.black87)),
                                        ],
                                      ),
                                    ))
                                .toList(),
                          ),
                        ],
                      ],

                      const SizedBox(height: 20),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildStatCard(String label, String value, String hint, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: Colors.grey[200]!),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(4)),
                child: Icon(icon, size: 16, color: color),
              ),
              Expanded(
                child: Text(hint, textAlign: TextAlign.right, style: const TextStyle(fontSize: 10, color: Colors.grey), overflow: TextOverflow.ellipsis),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold), overflow: TextOverflow.ellipsis, maxLines: 2),
        ],
      ),
    );
  }

  Widget _buildFilterTab(String value, String label, String selectedFilter) {
    bool isActive = value == selectedFilter;
    return GestureDetector(
      onTap: () => setState(() => _selectedFilter = value),
      child: Container(
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isActive ? Colors.blue : Colors.grey[100]!,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(label, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: isActive ? Colors.white : Colors.black87)),
      ),
    );
  }

  Widget _buildDetailedVariantCard(Map variant, List allVarSpecs, String? productMainImage) {
    List variantSpecs = allVarSpecs.where((s) => s['product_variant_id'] == variant['id']).toList();
    List groupedSpecs = _groupSpecs(variantSpecs);

    double original = double.tryParse(variant['price'].toString()) ?? 0.0;
    double effective = variant['effective_price'] != null ? double.tryParse(variant['effective_price'].toString()) ?? original : original;
    bool isDiscounted = effective < original;
    
    final imageUrl = _resolveImageUrl(variant['image_url'] ?? productMainImage);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(border: Border.all(color: Colors.grey[200]!), borderRadius: BorderRadius.circular(8)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header with image and info
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: Container(
                    width: 100,
                    height: 100,
                    color: Colors.grey[200]!,
                    child: imageUrl.isEmpty
                        ? const Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.image_not_supported, size: 40, color: Colors.grey),
                              SizedBox(height: 4),
                              Text('Không tải được', style: TextStyle(fontSize: 10, color: Colors.grey)),
                            ],
                          )
                        : Image.network(
                            imageUrl,
                            fit: BoxFit.cover,
                          ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(variant['variant_name'] ?? '', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold), overflow: TextOverflow.ellipsis),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: variant['is_active'] ? Colors.green[100]! : Colors.red[100]!,
                              borderRadius: BorderRadius.circular(3),
                            ),
                            child: Text(
                              variant['is_active'] ? 'HOẠT ĐỘNG' : 'TẠM NGỪNG',
                              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: variant['is_active'] ? Colors.green[700]! : Colors.red[700]!),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      _buildMetaRow('SKU:', variant['sku'] ?? '—'),
                      _buildMetaRow('Màu sắc:', variant['color']?.isNotEmpty ?? false ? variant['color'] : '—'),
                      _buildMetaRow('Cấu hình:', variant['configuration']?.isNotEmpty ?? false ? variant['configuration'] : '—'),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          if (isDiscounted) ...[
                            Text(_formatCurrency(original), style: TextStyle(fontSize: 10, decoration: TextDecoration.lineThrough, color: Colors.grey)),
                            const SizedBox(width: 6),
                          ],
                          Text(_formatCurrency(effective), style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.red)),
                          const Spacer(),
                          Text('Kho: ${variant['stock_quantity'] ?? 0}', style: const TextStyle(fontSize: 13, color: Colors.grey)),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Variant specs
          if (variantSpecs.isNotEmpty) ...[
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Thông số kỹ thuật riêng phiên bản', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  _buildGroupedSpecsTable(groupedSpecs),
                ],
              ),
            ),
          ] else ...[
            const Divider(height: 1),
            const Padding(
              padding: EdgeInsets.all(12),
              child: Text('Không có thông số kỹ thuật riêng biệt cho phiên bản này.', style: TextStyle(fontSize: 13, color: Colors.grey)),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildMetaRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
          const SizedBox(width: 6),
          Expanded(child: Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500), overflow: TextOverflow.ellipsis)),
        ],
      ),
    );
  }

  List _groupSpecs(List specs) {
    Map<String, List> groups = {};
    for (var spec in specs) {
      String groupName = spec['spec_group'] ?? 'Thông số chung';
      groups.putIfAbsent(groupName, () => []).add(spec);
    }
    return groups.entries.map((entry) {
      List sortedSpecs = (entry.value as List)..sort((a, b) => (a['sort_order'] ?? 0).compareTo(b['sort_order'] ?? 0));
      return {'groupName': entry.key, 'specs': sortedSpecs};
    }).toList()
      ..sort((a, b) => (a['groupName'] as String).compareTo(b['groupName'] as String));
  }

  Widget _buildGroupedSpecsTable(List groupedSpecs) {
    if (groupedSpecs.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: groupedSpecs.map((group) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(group['groupName'], style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.blue)),
            const SizedBox(height: 6),
            Table(
              border: TableBorder(
                horizontalInside: BorderSide(color: Colors.grey[200]!),
                bottom: BorderSide(color: Colors.grey[200]!),
              ),
              columnWidths: const {0: FlexColumnWidth(1), 1: FlexColumnWidth(1.5)},
              children: (group['specs'] as List)
                  .map((spec) => TableRow(
                        children: [
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 4),
                            child: Text(spec['spec_key'] ?? '', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Colors.black87)),
                          ),
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 4),
                            child: Text('${spec['spec_value'] ?? ''} ${spec['spec_unit'] ?? ''}'.trim(), style: const TextStyle(fontSize: 12, color: Colors.grey)),
                          ),
                        ],
                      ))
                  .toList(),
            ),
            const SizedBox(height: 12),
          ],
        );
      }).toList(),
    );
  }
}