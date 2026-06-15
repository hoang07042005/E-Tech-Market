import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:e_tech_market_app/services/admin_products_service.dart';
import '../../../config/api_config.dart';
import '../../../utils/network_utils.dart';
import '../../../utils/translation.dart';

class AdminProductFormScreen extends StatefulWidget {
  final int? productId;

  const AdminProductFormScreen({super.key, this.productId});

  @override
  State<AdminProductFormScreen> createState() => _AdminProductFormScreenState();
}

class _AdminProductFormScreenState extends State<AdminProductFormScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;

  // --- THÔNG TIN CHUNG ---
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _priceController = TextEditingController();
  final TextEditingController _brandController = TextEditingController();
  final TextEditingController _descController = TextEditingController();
  String? _selectedCategoryId;
  bool _isActive = true;
  List<dynamic> _categories = [];

  // --- QUẢN LÝ HÌNH ẢNH ---
  File? _mainImageFile;
  String? _mainImageUrlPreview;
  final List<File> _additionalImageFiles = [];
  List<dynamic> _existingAdditionalUrls = [];
  final ImagePicker _picker = ImagePicker();

  // --- QUẢN LÝ BIẾN THỂ (VARIANTS) ---
  List<Map<String, dynamic>> _variants = [];
  List<File?> _variantImageFiles = [];
  final TextEditingController _quickPasteController = TextEditingController();

  // --- QUẢN LÝ THÔNG SỐ (SPECS) & FAQ ---
  List<Map<String, dynamic>> _specs = [];
  List<Map<String, dynamic>> _faqs = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadInitData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _nameController.dispose();
    _priceController.dispose();
    _brandController.dispose();
    _descController.dispose();
    _quickPasteController.dispose();
    super.dispose();
  }

  Future<void> _loadInitData() async {
    setState(() => _isLoading = true);
    try {
      final cats = await AdminProductsService.fetchAdminCategories();
      _categories = cats;

      if (widget.productId != null) {
        final product = await AdminProductsService.fetchAdminProductDetail(widget.productId!);
        
        _nameController.text = product['name'] ?? '';
        _priceController.text = (product['price'] ?? '').toString();
        _brandController.text = product['brand'] ?? '';
        _descController.text = product['description'] ?? '';
        _selectedCategoryId = product['category_id']?.toString();
        _isActive = product['is_active'] == true || product['is_active'] == 1;
        _mainImageUrlPreview = product['main_image_url'];

        if (product['images'] != null) {
          _existingAdditionalUrls = List.from(product['images']);
        }

        if (product['variants'] != null) {
          _variants.clear();
          _variantImageFiles.clear();
          for (var v in product['variants']) {
            _variants.add({
              'id': v['id'],
              'variant_name': v['variant_name'] ?? '',
              'color': v['color'] ?? '',
              'configuration': v['configuration'] ?? '',
              'sku': v['sku'] ?? '',
              'price': (v['price'] ?? '').toString(),
              'discount_type': v['discount_type'] ?? 'none',
              'discount_value': (v['discount_value'] ?? '').toString(),
              'discount_start_at': v['discount_start_at'] ?? '',
              'discount_end_at': v['discount_end_at'] ?? '',
              'stock_quantity': v['stock_quantity'] ?? 0,
              'image_url': v['image_url'],
            });
            _variantImageFiles.add(null);
          }
        }
        if (product['specs'] != null) {
          _specs = (product['specs'] as List<dynamic>).map((spec) {
            final Map<String, dynamic> s = Map<String, dynamic>.from(spec);
            // Convert backend product_variant_id/product_variant_index back to scope format
            if (s['product_variant_id'] != null && s['product_variant_id'] != '') {
              s['scope'] = 'variant:${s['product_variant_id']}';
            } else if (s['product_variant_index'] != null && s['product_variant_index'] != '') {
              s['scope'] = 'idx:${s['product_variant_index']}';
            } else {
              s['scope'] = 'common';
            }
            return s;
          }).toList();
        }
        if (product['faqs'] != null) {
          _faqs = List<Map<String, dynamic>>.from(product['faqs']);
        }
      } else {
        _addBlankVariant();
      }
    } catch (e) {
      _showSnackBar('${Trans.errorOccurred}: $e', Colors.red);
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _handleVariantQuickPaste() {
    final text = _quickPasteController.text.trim();
    if (text.isEmpty) return;

    final lines = const LineSplitter().convert(text);
    int addedCount = 0;

    setState(() {
      for (var line in lines) {
        if (line.trim().isEmpty) continue;
        final parts = line.split('|');
        
        String name = parts.isNotEmpty ? parts[0].trim() : '';
        String color = parts.length > 1 ? parts[1].trim() : '';
        String config = parts.length > 2 ? parts[2].trim() : '';
        String price = parts.length > 3 ? parts[3].trim() : '';
        int stock = parts.length > 4 ? (int.tryParse(parts[4].trim()) ?? 0) : 0;

        if (name.isNotEmpty) {
          _variants.add({
            'variant_name': name,
            'color': color,
            'configuration': config,
            'sku': '',
            'price': price,
            'discount_type': 'none',
            'discount_value': '',
            'discount_start_at': '',
            'discount_end_at': '',
            'stock_quantity': stock,
          });
          _variantImageFiles.add(null);
          addedCount++;
        }
      }
    });

    _quickPasteController.clear();
    Navigator.pop(context);
    _showSnackBar('$addedCount ${Trans.variantsAdded}', Colors.green);
  }

  void _openQuickPasteModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) => Padding(
        padding: EdgeInsets.fromLTRB(20, 16, 20, MediaQuery.of(context).viewInsets.bottom + 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(Trans.quickPasteVariants, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
                IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              '${Trans.quickPasteFormat}\n${Trans.quickPasteExample}',
              style: TextStyle(fontSize: 12, color: Colors.grey[600], height: 1.4),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _quickPasteController,
              maxLines: 5,
              style: const TextStyle(fontSize: 14),
              decoration: InputDecoration(
                hintText: Trans.quickPasteHint,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                filled: true,
                fillColor: const Color(0xFFF8FAFC),
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _handleVariantQuickPaste,
                icon: const Icon(Icons.bolt, color: Colors.white),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF4F46E5),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                label: Text(Trans.analyzeData, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              ),
            )
          ],
        ),
      ),
    );
  }

  void _addBlankVariant() {
    _variants.add({
      'variant_name': '',
      'color': '',
      'configuration': '',
      'sku': '',
      'price': '',
      'discount_type': 'none',
      'discount_value': '',
      'discount_start_at': '',
      'discount_end_at': '',
      'stock_quantity': 0,
    });
    _variantImageFiles.add(null);
  }

  void _addBlankSpec() {
    _specs.add({'spec_group': 'Chung', 'spec_key': '', 'spec_value': '', 'spec_unit': '', 'scope': 'common'});
  }

  void _addBlankFaq() {
    _faqs.add({'question': '', 'answer': '', 'sort_order': _faqs.length + 1, 'is_active': true});
  }

  Future<void> _pickMainImage() async {
    final XFile? picked = await _picker.pickImage(source: ImageSource.gallery);
    if (picked != null) setState(() => _mainImageFile = File(picked.path));
  }

  Future<void> _pickAdditionalImages() async {
    final List<XFile> pickedList = await _picker.pickMultiImage();
    if (pickedList.isNotEmpty) {
      setState(() => _additionalImageFiles.addAll(pickedList.map((e) => File(e.path))));
    }
  }

  Future<void> _pickVariantImage(int index) async {
    final XFile? picked = await _picker.pickImage(source: ImageSource.gallery);
    if (picked != null) setState(() => _variantImageFiles[index] = File(picked.path));
  }

  void _showSnackBar(String text, Color bg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text), backgroundColor: bg, behavior: SnackBarBehavior.floating));
  }

  Future<void> _submitForm() async {
    if (!_formKey.currentState!.validate()) {
      _showSnackBar(Trans.verifyInputs, Colors.amber[800]!);
      return;
    }
    setState(() => _isLoading = true);
    try {
      // Transform variants: convert discount_type 'none' → null (database only allows 'percentage' or 'fixed')
      final transformedVariants = _variants.map((variant) {
        final Map<String, dynamic> transformed = {...variant};
        final discountType = transformed['discount_type']?.toString() ?? 'none';
        
        if (discountType == 'none') {
          transformed['discount_type'] = null;
          transformed['discount_value'] = '';
        }
        
        return transformed;
      }).toList();

      // Transform specs to use product_variant_id/product_variant_index instead of scope
      final transformedSpecs = _specs.map((spec) {
        final Map<String, dynamic> transformed = {...spec};
        final scope = spec['scope']?.toString() ?? 'common';
        
        if (scope == 'common') {
          transformed.remove('product_variant_id');
          transformed.remove('product_variant_index');
        } else if (scope.startsWith('variant:')) {
          final variantId = int.tryParse(scope.replaceFirst('variant:', ''));
          transformed['product_variant_id'] = variantId;
          transformed.remove('product_variant_index');
        } else if (scope.startsWith('idx:')) {
          final idx = int.tryParse(scope.replaceFirst('idx:', ''));
          transformed['product_variant_index'] = idx;
          transformed.remove('product_variant_id');
        }
        
        transformed.remove('scope');
        return transformed;
      }).toList();

      final Map<String, String> textFields = {
        'name': _nameController.text.trim(),
        'price': _priceController.text.trim(),
        'brand': _brandController.text.trim(),
        'description': _descController.text.trim(),
        'category_id': _selectedCategoryId ?? '',
        'is_active': _isActive ? '1' : '0',
        'variants': jsonEncode(transformedVariants),
        'specs': jsonEncode(transformedSpecs),
        'faqs': jsonEncode(_faqs),
      };

      await AdminProductsService.saveAdminProduct(
        id: widget.productId,
        fields: textFields,
        mainImage: _mainImageFile,
        additionalImages: _additionalImageFiles,
        variantImages: _variantImageFiles,
      );

      if (mounted) {
        _showSnackBar(widget.productId == null ? Trans.productAdded : Trans.productUpdated, Colors.green);
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) _showSnackBar('Lỗi lưu dữ liệu: $e', Colors.red);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      appBar: AppBar(
        elevation: 1,
        backgroundColor: Theme.of(context).colorScheme.surface,
        foregroundColor: Theme.of(context).colorScheme.onSurface,
        title: Text(widget.productId != null ? Trans.editProduct : Trans.addProductNew, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        bottom: TabBar(
          controller: _tabController,
          labelColor: const Color(0xFF4F46E5),
          unselectedLabelColor: const Color(0xFF64748B),
          indicatorColor: const Color(0xFF4F46E5),
          indicatorWeight: 3,
          tabs: [
            Tab(text: Trans.originalTab),
            Tab(text: Trans.variantsTab),
            Tab(text: Trans.specsFaqTab),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF4F46E5)))
          : Form(
              key: _formKey,
              child: TabBarView(
                controller: _tabController,
                children: [
                  _buildGeneralInfoTab(),
                  _buildVariantsTab(),
                  _buildSpecsAndFaqTab(),
                ],
              ),
            ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        decoration: BoxDecoration(color: Theme.of(context).colorScheme.surface, boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, -4))]),
        child: Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: () => Navigator.pop(context),
                style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)), side: const BorderSide(color: Color(0xFFCBD5E1))),
                child: Text(Trans.cancel, style: const TextStyle(color: Color(0xFF475569), fontWeight: FontWeight.w600)),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: ElevatedButton(
                onPressed: _submitForm,
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF4F46E5), padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)), elevation: 0),
                child: Text(Trans.saveProduct, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ================= TAB 1: THÔNG TIN CƠ BẢN & HÌNH ẢNH BAN ĐẦU =================
  Widget _buildGeneralInfoTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          _buildFormCard(
            title: Trans.basicInfo,
            icon: Icons.assignment_outlined,
            child: Column(
              children: [
                _buildTextField(controller: _nameController, label: '${Trans.productName} *', hint: Trans.productNameHint, validator: (v) => v!.isEmpty ? Trans.fieldRequired : null),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(child: _buildTextField(controller: _priceController, label: '${Trans.defaultPrice} *', hint: Trans.priceHint, isNumber: true, validator: (v) => v!.isEmpty ? Trans.priceRequired : null)),
                    const SizedBox(width: 12),
                    Expanded(child: _buildTextField(controller: _brandController, label: Trans.brand, hint: Trans.brandHint)),
                  ],
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  value: _selectedCategoryId,
                  style: const TextStyle(color: Color(0xFF1E293B), fontSize: 14),
                  decoration: _inputDecoration('${Trans.categoryRequired} *', Trans.selectCategory),
                  items: _categories.map((c) => DropdownMenuItem<String>(value: c['id'].toString(), child: Text(c['name'] ?? ''))).toList(),
                  onChanged: (val) => setState(() => _selectedCategoryId = val),
                  validator: (v) => v == null ? Trans.categoryRequiredMsg : null,
                ),
                const SizedBox(height: 12),
                SwitchListTile(
                  title: Text(Trans.publicDisplayStatus, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF334155))),
                  subtitle: Text(Trans.enableToDisplayOnMarketplace, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                  value: _isActive,
                  contentPadding: EdgeInsets.zero,
                  activeColor: const Color(0xFF10B981),
                  onChanged: (val) => setState(() => _isActive = val),
                )
              ],
            ),
          ),
          const SizedBox(height: 16),
          _buildFormCard(
            title: Trans.productSummary,
            icon: Icons.description_outlined,
            child: _buildTextField(controller: _descController, label: Trans.productDescLabel, hint: Trans.productDescHint, maxLines: 4),
          ),
          const SizedBox(height: 16),
          _buildFormCard(
            title: Trans.imageCollection,
            icon: Icons.collections_outlined,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(Trans.mainImage, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF475569))),
                const SizedBox(height: 8),
                Row(
                  children: [
                    _imagePreviewBox(_mainImageFile, _mainImageUrlPreview),
                    const SizedBox(width: 16),
                    OutlinedButton.icon(
                      onPressed: _pickMainImage,
                      icon: const Icon(Icons.cloud_upload_outlined, size: 16),
                      label: Text(Trans.uploadImage),
                      style: OutlinedButton.styleFrom(side: const BorderSide(color: Color(0xFF6366F1)), foregroundColor: const Color(0xFF6366F1)),
                    ),
                  ],
                ),
                const Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Divider(color: Color(0xFFE2E8F0))),
                Text(Trans.detailImageAlbum, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF475569))),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: [
                    ..._existingAdditionalUrls.map((urlData) => _stackImageItem(urlData, true, () => setState(() => _existingAdditionalUrls.remove(urlData)))),
                    ..._additionalImageFiles.map((file) => _stackImageItem(file.path, false, () => setState(() => _additionalImageFiles.remove(file)))),
                    if (_existingAdditionalUrls.length + _additionalImageFiles.length < 12)
                      InkWell(
                        onTap: _pickAdditionalImages,
                        child: Container(
                          width: 72,
                          height: 72,
                          decoration: BoxDecoration(color: const Color(0xFFEEF2F6), borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFFC7D2FE), width: 0.15)),
                          child: const Icon(Icons.add_photo_alternate_outlined, color: Color(0xFF4F46E5)),
                        ),
                      )
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ================= TAB 2: QUẢN LÝ PHIÊN BẢN (VARIANTS) =================
  Widget _buildVariantsTab() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _variants.length + 1,
      itemBuilder: (context, index) {
        if (index == _variants.length) {
          return Padding(
            padding: const EdgeInsets.only(top: 8, bottom: 24),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _openQuickPasteModal,
                    style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 13), foregroundColor: const Color(0xFF6B21A8), side: const BorderSide(color: Color(0xFFA855F7), width: 0.15), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                    icon: const Icon(Icons.flash_on_outlined, size: 16),
                    label: Text(Trans.quickPasteWebClip, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => setState(_addBlankVariant),
                    style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 13), backgroundColor: const Color(0xFF4F46E5), elevation: 0, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                    icon: const Icon(Icons.add, size: 16, color: Colors.white),
                    label: Text(Trans.addManually, style: const TextStyle(fontSize: 13, color: Colors.white, fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          );
        }

        final item = _variants[index];
        return Container(
          margin: const EdgeInsets.only(bottom: 16),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            borderRadius: BorderRadius.circular(14),
            boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 10, offset: const Offset(0, 2))],
            border: Border.all(color: Theme.of(context).colorScheme.outline, width: 0.15),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(color: const Color(0xFFEDE9FE), borderRadius: BorderRadius.circular(8)),
                    child: Text('${Trans.variant} #${index + 1}', style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF4338CA), fontSize: 12)),
                  ),
                  const Spacer(),
                  if (_variants.length > 1)
                    IconButton(
                      icon: const Icon(Icons.delete_outline, color: Color(0xFFEF4444), size: 22),
                      onPressed: () => setState(() {
                        _variants.removeAt(index);
                        _variantImageFiles.removeAt(index);
                      }),
                    ),
                ],
              ),
              const SizedBox(height: 14),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  InkWell(
                    onTap: () => _pickVariantImage(index),
                    child: _variantImageFiles[index] != null
                        ? Container(
                            width: 88,
                            height: 88,
                            decoration: BoxDecoration(borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFE2E8F0))),
                            child: ClipRRect(borderRadius: BorderRadius.circular(12), child: Image.file(_variantImageFiles[index]!, fit: BoxFit.cover)),
                          )
                        : _imagePreviewBox(null, item['image_url']),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: _buildItemTextField(
                      label: 'Tên bản / Cấu hình *',
                      initVal: item['variant_name'],
                      onChanged: (v) => item['variant_name'] = v,
                      validator: (v) => v!.isEmpty ? 'Vui lòng điền tên phiên bản' : null,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(child: _buildItemTextField(label: 'Màu sắc', initVal: item['color'], onChanged: (v) => item['color'] = v)),
                  const SizedBox(width: 12),
                  Expanded(child: _buildItemTextField(label: 'Cấu hình', initVal: item['configuration'], onChanged: (v) => item['configuration'] = v)),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(child: _buildItemTextField(label: 'Giá bán (đ) *', initVal: item['price'], isNum: true, onChanged: (v) => item['price'] = v, validator: (v) => v!.isEmpty ? 'Trống giá' : null)),
                  const SizedBox(width: 12),
                  Expanded(child: _buildItemTextField(label: 'Kho hàng', initVal: item['stock_quantity'].toString(), isNum: true, onChanged: (v) => item['stock_quantity'] = int.tryParse(v) ?? 0)),
                ],
              ),
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: Theme.of(context).colorScheme.surface, borderRadius: BorderRadius.circular(10), border: Border.all(color: Theme.of(context).colorScheme.outline, width: 0.15)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Ưu đãi', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF5B21B6))),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            value: item['discount_type'] ?? 'none',
                            style: TextStyle(fontSize: 13, color: Theme.of(context).colorScheme.onSurface),
                            decoration: const InputDecoration(labelText: 'Kiểu giảm', isDense: true, contentPadding: EdgeInsets.symmetric(vertical: 10, horizontal: 12), border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(8)))),
                            items: const [
                              DropdownMenuItem(value: 'none', child: Text('Không ưu đãi')),
                              DropdownMenuItem(value: 'percentage', child: Text('Phần trăm %')),
                              DropdownMenuItem(value: 'fixed', child: Text('Cố định (đ)'),),
                            ],
                            onChanged: (v) => setState(() => item['discount_type'] = v),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(child: _buildItemTextField(label: 'Giá trị', initVal: item['discount_value'], isNum: true, onChanged: (v) => item['discount_value'] = v)),
                      ],
                    ),
                    if (item['discount_type'] != null && item['discount_type'] != 'none') ...[
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(child: _buildDatePickerField(label: 'Từ ngày', value: item['discount_start_at'], onDateSelected: (v) => item['discount_start_at'] = v)),
                          const SizedBox(width: 12),
                          Expanded(child: _buildDatePickerField(label: 'Đến ngày', value: item['discount_end_at'], onDateSelected: (v) => item['discount_end_at'] = v)),
                        ],
                      ),
                    ]
                  ],
                ),
              )
            ],
          ),
        );
      },
    );
  }

  // ================= TAB 3: THÔNG SỐ KỸ THUẬT & FAQ HỎI ĐÁP =================
  Widget _buildSpecsAndFaqTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(Icons.tune_outlined, size: 18, color: Color(0xFF475569)),
                  SizedBox(width: 6),
                  Text('Bảng thông số kỹ thuật', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface)),
                ],
              ),
              TextButton.icon(
                onPressed: () => setState(_addBlankSpec),
                icon: const Icon(Icons.add_circle, size: 16, color: Color(0xFF4F46E5)),
                label: const Text('Thêm mục mới', style: TextStyle(color: Color(0xFF4F46E5), fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          const SizedBox(height: 10),
          if (_specs.isEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: const Color(0xFFEEF2FF), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFBFDBFE))),
              child: const Text('Hiện chưa có thông số kỹ thuật. Nhấn Thêm mục mới để bắt đầu.', style: TextStyle(color: Color(0xFF1E40AF))),
            ),
          const SizedBox(height: 10),
          ..._specs.asMap().entries.map((entry) {
            final idx = entry.key;
            final spec = entry.value;
            return Container(
              margin: const EdgeInsets.only(bottom: 14),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: Theme.of(context).colorScheme.surface, borderRadius: BorderRadius.circular(14), border: Border.all(color: Theme.of(context).colorScheme.outline, width: 0.15)),
              child: Column(
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          value: spec['scope']?.toString() ?? 'common',
                          isExpanded: true,
                          decoration: _inputDecoration('Áp dụng', 'Chung / Phiên bản'),
                          items: [
                            const DropdownMenuItem(value: 'common', child: Text('Chung (mọi phiên bản)')),
                            ..._variants.asMap().entries.map((variantEntry) {
                              final variant = variantEntry.value;
                              final label = (variant['variant_name']?.toString().trim().isNotEmpty == true)
                                  ? 'Chỉ: ${variant['variant_name']}'
                                  : 'Phiên bản ${variantEntry.key + 1}';
                              return DropdownMenuItem(
                                value: variant['id'] != null ? 'variant:${variant['id']}' : 'idx:${variantEntry.key}',
                                child: Text(label),
                              );
                            }).toList(),
                          ],
                          onChanged: (value) => setState(() => spec['scope'] = value ?? 'common'),
                        ),
                      ),
                      const SizedBox(width: 10),
                      SizedBox(width: 140, child: _buildItemTextField(label: 'Nhóm', initVal: spec['spec_group'], onChanged: (v) => spec['spec_group'] = v)),
                      const SizedBox(width: 8),
                      IconButton(icon: const Icon(Icons.cancel, color: Color(0xFF94A3B8), size: 20), onPressed: () => setState(() => _specs.removeAt(idx))),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(flex: 3, child: _buildItemTextField(label: 'Tên thông số', initVal: spec['spec_key'], onChanged: (v) => spec['spec_key'] = v)),
                      const SizedBox(width: 10),
                      Expanded(flex: 2, child: _buildItemTextField(label: 'Giá trị', initVal: spec['spec_value'], onChanged: (v) => spec['spec_value'] = v)),
                      const SizedBox(width: 10),
                      Expanded(flex: 1, child: _buildItemTextField(label: 'Đơn vị', initVal: spec['spec_unit'], onChanged: (v) => spec['spec_unit'] = v)),
                    ],
                  ),
                ],
              ),
            );
          }),
          const Padding(padding: EdgeInsets.symmetric(vertical: 10), child: Divider(color: Color(0xFFCBD5E1))),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(Icons.quiz_outlined, size: 18, color: Color(0xFF475569)),
                  SizedBox(width: 6),
                  Text('Hỏi đáp tư vấn khách hàng', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface)),
                ],
              ),
              TextButton.icon(
                onPressed: () => setState(_addBlankFaq),
                icon: const Icon(Icons.add_circle, size: 16, color: Color(0xFF4F46E5)),
                label: const Text('Thêm câu hỏi', style: TextStyle(color: Color(0xFF4F46E5), fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          const SizedBox(height: 10),
          if (_faqs.isEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: const Color(0xFFF6F6FF), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFCBD5E1))),
              child: const Text('Chưa có câu hỏi nào. Nhấn Thêm câu hỏi để tạo FAQ.', style: TextStyle(color: Color(0xFF334155))),
            ),
          const SizedBox(height: 10),
          ..._faqs.asMap().entries.map((entry) {
            final idx = entry.key;
            final faq = entry.value;
            return Container(
              margin: const EdgeInsets.only(bottom: 14),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: Theme.of(context).colorScheme.surface, borderRadius: BorderRadius.circular(14), border: Border.all(color: Theme.of(context).colorScheme.outline, width: 0.15)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(child: _buildItemTextField(label: 'Câu hỏi', initVal: faq['question'], onChanged: (v) => faq['question'] = v)),
                      const SizedBox(width: 10),
                      SizedBox(width: 90, child: _buildItemTextField(label: 'Thứ tự', initVal: faq['sort_order'].toString(), isNum: true, onChanged: (v) => faq['sort_order'] = int.tryParse(v) ?? 0)),
                      const SizedBox(width: 8),
                      IconButton(icon: const Icon(Icons.delete_outline, color: Color(0xFFEF4444), size: 20), onPressed: () => setState(() => _faqs.removeAt(idx))),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    initialValue: faq['answer'],
                    maxLines: 3,
                    style: const TextStyle(fontSize: 13),
                    decoration: InputDecoration(
                      labelText: 'Trả lời / Giải thích',
                      isDense: true,
                      alignLabelWithHint: true,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      contentPadding: const EdgeInsets.all(12),
                    ),
                    onChanged: (v) => faq['answer'] = v,
                  ),
                ],
              ),
            );
          }),
          const SizedBox(height: 28),
        ],
      ),
    );
  }

  // ================= CÁC COMPONENT GIAO DIỆN HỖ TRỢ TÁI SỬ DỤNG =================
  Widget _buildFormCard({required String title, required IconData icon, required Widget child}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface, 
        borderRadius: BorderRadius.circular(12), 
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 6, offset: const Offset(0, 2))],
        border: Border.all(color: Theme.of(context).colorScheme.outline, width: 0.15)
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: const Color(0xFF4F46E5)),
              const SizedBox(width: 6),
              Text(title, style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface)),
            ],
          ),
          const Padding(padding: EdgeInsets.symmetric(vertical: 8), child: Divider(height: 1, color: Color(0xFFF1F5F9))),
          child,
        ],
      ),
    );
  }

  Widget _buildTextField({required TextEditingController controller, required String label, required String hint, bool isNumber = false, int maxLines = 1, String? Function(String?)? validator}) {
    return TextFormField(
      controller: controller,
      maxLines: maxLines,
      keyboardType: isNumber ? TextInputType.number : TextInputType.text,
      style: TextStyle(fontSize: 14, color: Theme.of(context).colorScheme.onSurface),
      decoration: _inputDecoration(label, hint),
      validator: validator,
    );
  }

  Widget _buildItemTextField({required String label, required String? initVal, bool isNum = false, required Function(String) onChanged, String? Function(String?)? validator}) {
    return TextFormField(
      initialValue: initVal,
      style: TextStyle(fontSize: 13, color: Theme.of(context).colorScheme.onSurface),
      keyboardType: isNum ? TextInputType.number : TextInputType.text,
      decoration: InputDecoration(
        labelText: label,
        isDense: true,
        contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: Theme.of(context).colorScheme.outline, width: 0.15)),
      ),
      onChanged: onChanged,
      validator: validator,
    );
  }

  Widget _buildDatePickerField({required String label, required String? value, required ValueChanged<String> onDateSelected}) {
    final controller = TextEditingController(text: value);
    return InkWell(
      borderRadius: BorderRadius.circular(8),
      onTap: () async {
        final initialDate = DateTime.tryParse(value ?? '') ?? DateTime.now();
        final pickedDate = await showDatePicker(
          context: context,
          initialDate: initialDate,
          firstDate: DateTime(2000),
          lastDate: DateTime(2100),
          builder: (context, child) => Theme(
            data: Theme.of(context).copyWith(
              colorScheme: const ColorScheme.light(primary: Color(0xFF4F46E5), onPrimary: Colors.white, onSurface: Colors.black),
            ),
            child: child!,
          ),
        );
        if (pickedDate != null) {
          setState(() {
            onDateSelected(pickedDate.toIso8601String().split('T').first);
          });
        }
      },
      child: IgnorePointer(
        child: TextFormField(
          key: ValueKey(value ?? ''),
          controller: controller,
          readOnly: true,
          style: const TextStyle(fontSize: 13, color: Color(0xFF1E293B)),
          decoration: InputDecoration(
            labelText: label,
            isDense: true,
            contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: Theme.of(context).colorScheme.outline, width: 0.5)),
            suffixIcon: const Icon(Icons.calendar_today, size: 18, color: Color(0xFF64748B)),
          ),
        ),
      ),
    );
  }

  InputDecoration _inputDecoration(String label, String hint) {
    return InputDecoration(
      labelText: label,
      hintText: hint,
      labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: Color(0xFF475569)),
      hintStyle: TextStyle(fontSize: 13, color: Colors.grey[400]),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: Theme.of(context).colorScheme.outline, width: 0.5)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: Theme.of(context).colorScheme.outline, width: 0.5)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: Theme.of(context).colorScheme.outline, width: 0.5)),
    );
  }

  String _resolveImageUrl(String? url) {
    return NetworkUtils.fixDeviceUrl(url);
  }

  // SỬA LỖI HIỂN THỊ ẢNH: Xử lý an toàn cả String (URL trực tiếp) và Map (Đối tượng ảnh từ database)
  Widget _imagePreviewBox(File? file, dynamic urlSource) {
    String? imageUrl;
    if (urlSource != null) {
      if (urlSource is String) {
        imageUrl = urlSource;
      } else if (urlSource is Map && urlSource.containsKey('image_url')) {
        imageUrl = urlSource['image_url'];
      }
    }

    return Container(
      width: 72,
      height: 72,
      decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFFE2E8F0))),
      child: file != null
          ? ClipRRect(borderRadius: BorderRadius.circular(8), child: Image.file(file, fit: BoxFit.cover))
          : (imageUrl != null && imageUrl.isNotEmpty
              ? ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.network(
                    _resolveImageUrl(imageUrl),
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) => const Icon(Icons.broken_image_outlined, color: Colors.red, size: 24),
                  ),
                )
              : const Icon(Icons.image_outlined, color: Color(0xFF94A3B8), size: 24)),
    );
  }

  Widget _stackImageItem(dynamic urlSource, bool isNetwork, VoidCallback onDelete) {
    String displayPath = '';
    if (isNetwork && urlSource != null) {
      if (urlSource is String) {
        displayPath = urlSource;
      } else if (urlSource is Map && urlSource.containsKey('image_url')) {
        displayPath = urlSource['image_url'];
      }
    } else if (urlSource is String) {
      displayPath = urlSource;
    }

    return Stack(
      children: [
        Container(
          width: 72,
          height: 72,
          margin: const EdgeInsets.only(top: 4, right: 4),
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFFE2E8F0))),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: isNetwork
                ? Image.network(
                    _resolveImageUrl(displayPath),
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) => const Icon(Icons.broken_image_outlined, color: Colors.grey, size: 20),
                  )
                : Image.file(File(displayPath), fit: BoxFit.cover),
          ),
        ),
        Positioned(
          top: 0,
          right: 0,
          child: GestureDetector(
            onTap: onDelete,
            child: Container(
              padding: const EdgeInsets.all(3),
              decoration: const BoxDecoration(color: Color(0xFFEF4444), shape: BoxShape.circle),
              child: const Icon(Icons.close, size: 10, color: Colors.white),
            ),
          ),
        )
      ],
    );
  }
}