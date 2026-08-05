import 'dart:convert';
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../config/dio_client.dart';

class TradeInScreen extends StatefulWidget {
  final Map<String, dynamic>? user;
  final bool showAppBar;

  const TradeInScreen({super.key, this.user, this.showAppBar = true});

  @override
  State<TradeInScreen> createState() => _TradeInScreenState();
}

class _TradeInScreenState extends State<TradeInScreen> {
  final _formKey = GlobalKey<FormState>();
  final _picker = ImagePicker();

  bool _isLoading = false;
  bool _isSubmitting = false;
  bool _isLoadingConditions = false;
  String? _errorMessage;
  String? _successMessage;

  int _step = 0;
  int? _selectedCategoryId;
  String? _selectedCategorySlug;

  final List<Map<String, dynamic>> _categories = [];
  final List<Map<String, dynamic>> _conditions = [];
  final List<int> _selectedConditionIds = [];
  final List<File> _images = [];

  final TextEditingController _machineNameCtrl = TextEditingController();
  final TextEditingController _phoneStorageCtrl = TextEditingController();
  final TextEditingController _phoneColorCtrl = TextEditingController();
  final TextEditingController _laptopRamCtrl = TextEditingController();
  final TextEditingController _laptopDiskCtrl = TextEditingController();
  final TextEditingController _laptopVgaCtrl = TextEditingController();
  final TextEditingController _warrantyCtrl = TextEditingController();
  final TextEditingController _accessoriesCtrl = TextEditingController();
  final TextEditingController _customerNameCtrl = TextEditingController();
  final TextEditingController _customerPhoneCtrl = TextEditingController();
  final TextEditingController _customerEmailCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _prefillUserInfo();
    _loadCategories();
  }

  @override
  void dispose() {
    _machineNameCtrl.dispose();
    _phoneStorageCtrl.dispose();
    _phoneColorCtrl.dispose();
    _laptopRamCtrl.dispose();
    _laptopDiskCtrl.dispose();
    _laptopVgaCtrl.dispose();
    _warrantyCtrl.dispose();
    _accessoriesCtrl.dispose();
    _customerNameCtrl.dispose();
    _customerPhoneCtrl.dispose();
    _customerEmailCtrl.dispose();
    super.dispose();
  }

  void _prefillUserInfo() {
    final user = widget.user;
    if (user == null) return;

    _customerNameCtrl.text = (user['name'] ?? '').toString();
    _customerPhoneCtrl.text = (user['phone'] ?? '').toString();
    _customerEmailCtrl.text = (user['email'] ?? '').toString();
  }

  Future<void> _loadCategories() async {
    setState(() => _isLoading = true);
    try {
      final response = await DioClient.instance.get('/trade-in/categories');
      final data = response.data as Map<String, dynamic>;
      if (data['status'] == 'success') {
        final list = data['data'] as List;
        setState(() {
          _categories.clear();
          _categories
              .addAll(list.map((e) => Map<String, dynamic>.from(e as Map)));
        });
      }
    } on DioException catch (e) {
      setState(() {
        _errorMessage =
            e.response?.data is Map && e.response?.data['message'] != null
                ? e.response!.data['message'].toString()
                : 'Không thể tải danh sách loại thiết bị.';
      });
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _loadConditions(int categoryId) async {
    setState(() {
      _isLoadingConditions = true;
      _conditions.clear();
      _selectedConditionIds.clear();
    });

    try {
      final response = await DioClient.instance.get('/trade-in/conditions',
          queryParameters: {'category_id': categoryId});
      final data = response.data as Map<String, dynamic>;
      if (data['status'] == 'success') {
        final list = data['data'] as List;
        setState(() {
          _conditions
              .addAll(list.map((e) => Map<String, dynamic>.from(e as Map)));
        });
      }
    } on DioException catch (e) {
      setState(() {
        _errorMessage =
            e.response?.data is Map && e.response?.data['message'] != null
                ? e.response!.data['message'].toString()
                : 'Không thể tải danh sách tình trạng.';
      });
    } finally {
      if (mounted) setState(() => _isLoadingConditions = false);
    }
  }

  void _selectCategory(int? id) {
    final category =
        _categories.firstWhere((c) => c['id'] == id, orElse: () => {});
    setState(() {
      _selectedCategoryId = id;
      _selectedCategorySlug =
          category is Map ? category['slug']?.toString() : null;
      _step = 0;
      _conditions.clear();
      _selectedConditionIds.clear();
      _errorMessage = null;
    });

    if (id != null) {
      _loadConditions(id);
    }
  }

  Future<void> _pickImages() async {
    final picked =
        await _picker.pickMultiImage(imageQuality: 80, maxWidth: 1440);
    if (picked.isEmpty) return;

    final total = _images.length + picked.length;
    if (total > 6) {
      setState(() {
        _successMessage = null;
        _errorMessage = 'Bạn chỉ có thể tải tối đa 6 ảnh.';
      });
      return;
    }

    setState(() {
      _images.addAll(picked.map((x) => File(x.path)).toList());
      _errorMessage = null;
    });
  }

  void _removeImage(int index) {
    setState(() {
      _images.removeAt(index);
    });
  }

  void _toggleCondition(int id) {
    setState(() {
      if (_selectedConditionIds.contains(id)) {
        _selectedConditionIds.remove(id);
      } else {
        _selectedConditionIds.add(id);
      }
    });
  }

  bool _isStep1Valid() {
    if (_selectedCategoryId == null) return false;
    if (_machineNameCtrl.text.trim().isEmpty) return false;
    if (_images.isEmpty) return false;

    if (_selectedCategorySlug == 'dien-thoai') {
      return _phoneStorageCtrl.text.trim().isNotEmpty &&
          _phoneColorCtrl.text.trim().isNotEmpty;
    }

    if (_selectedCategorySlug == 'laptop') {
      return _laptopRamCtrl.text.trim().isNotEmpty &&
          _laptopDiskCtrl.text.trim().isNotEmpty;
    }

    return true;
  }

  Future<void> _submitRequest() async {
    if (!_formKey.currentState!.validate()) return;

    if (!_isStep1Valid()) {
      setState(() => _errorMessage =
          'Vui lòng điền đầy đủ thông tin bắt buộc và tải ít nhất 1 ảnh.');
      return;
    }

    if (_selectedConditionIds.isEmpty) {
      setState(
          () => _errorMessage = 'Vui lòng chọn ít nhất một tình trạng máy.');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
      _successMessage = null;
    });

    try {
      final formData = FormData();
      formData.fields
          .add(MapEntry('category_id', _selectedCategoryId.toString()));

      String machineInfo = 'Tên máy: ${_machineNameCtrl.text.trim()}\n';
      if (_selectedCategorySlug == 'dien-thoai') {
        machineInfo += 'Dung lượng: ${_phoneStorageCtrl.text.trim()}\n';
        machineInfo += 'Màu sắc: ${_phoneColorCtrl.text.trim()}\n';
      } else if (_selectedCategorySlug == 'laptop') {
        machineInfo += 'RAM: ${_laptopRamCtrl.text.trim()}\n';
        machineInfo += 'Ổ cứng: ${_laptopDiskCtrl.text.trim()}\n';
        if (_laptopVgaCtrl.text.trim().isNotEmpty) {
          machineInfo += 'VGA: ${_laptopVgaCtrl.text.trim()}\n';
        }
      }

      machineInfo +=
          'Tình trạng bảo hành: ${_warrantyCtrl.text.trim().isEmpty ? 'Không rõ' : _warrantyCtrl.text.trim()}\n';
      machineInfo +=
          'Phụ kiện đi kèm: ${_accessoriesCtrl.text.trim().isEmpty ? 'Không rõ' : _accessoriesCtrl.text.trim()}';

      formData.fields.add(MapEntry('machine_info', machineInfo));

      for (var i = 0; i < _selectedConditionIds.length; i++) {
        formData.fields.add(
            MapEntry('condition_ids[$i]', _selectedConditionIds[i].toString()));
      }

      formData.fields
          .add(MapEntry('customer_name', _customerNameCtrl.text.trim()));
      formData.fields
          .add(MapEntry('customer_phone', _customerPhoneCtrl.text.trim()));
      if (_customerEmailCtrl.text.trim().isNotEmpty) {
        formData.fields
            .add(MapEntry('customer_email', _customerEmailCtrl.text.trim()));
      }

      for (var i = 0; i < _images.length; i++) {
        formData.files.add(MapEntry(
          'images[]',
          await MultipartFile.fromFile(_images[i].path,
              filename: 'image_$i.jpg'),
        ));
      }

      final response =
          await DioClient.instance.post('/trade-in/submit', data: formData);
      final data = response.data as Map<String, dynamic>;

      if (data['status'] == 'success') {
        setState(() {
          _successMessage = 'Gửi yêu cầu thu cũ thành công. Mã yêu cầu: ${data['data']['tracking_code'] ?? ''}';
          _errorMessage = null;
          _step = 0;
          _selectedCategoryId = null;
          _selectedCategorySlug = null;
          _machineNameCtrl.clear();
          _phoneStorageCtrl.clear();
          _phoneColorCtrl.clear();
          _laptopRamCtrl.clear();
          _laptopDiskCtrl.clear();
          _laptopVgaCtrl.clear();
          _warrantyCtrl.clear();
          _accessoriesCtrl.clear();
          _images.clear();
          _selectedConditionIds.clear();
        });
      }
    } on DioException catch (e) {
      setState(() {
        _successMessage = null;
        _errorMessage =
            e.response?.data is Map && e.response?.data['message'] != null
                ? e.response!.data['message'].toString()
                : 'Có lỗi xảy ra khi gửi yêu cầu.';
      });
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.colorScheme.surface,
      appBar: widget.showAppBar
          ? AppBar(
              title: const Text('Thu cũ đổi mới'),
              backgroundColor: theme.colorScheme.surface,
              foregroundColor: theme.colorScheme.onSurface,
            )
          : null,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildHeroCard(theme),
                const SizedBox(height: 12),
                _buildStepper(),
                const SizedBox(height: 16),
                _buildStepContent(theme),
                const SizedBox(height: 20),
                _buildNavigationBar(theme),
                const SizedBox(height: 32),
                _buildTradeInProcess(theme),
                const SizedBox(height: 32),
                _buildCommitments(theme),
                const SizedBox(height: 32),
                _buildImportantNotes(theme),
                const SizedBox(height: 32),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStepContent(ThemeData theme) {
    if (_step == 0) {
      return Container(
        decoration: BoxDecoration(color: theme.colorScheme.surface),
        padding: const EdgeInsets.all(10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildCategoryCard(theme),
            if (_selectedCategoryId != null) ...[
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Divider(color: Color(0xFFE2E8F0), height: 1),
              ),
              _buildDetailsCard(theme),
            ],
          ],
        ),
      );
    }
    if (_step == 1) {
      return _buildConditionCard(theme);
    }
    return _buildContactCard(theme);
  }

  Widget _buildStepper() {
    final titles = ['Thông tin máy', 'Tình trạng máy', 'Thông tin liên hệ'];
    // final subtitles = [
    //   'Chọn và nhập thông tin thiết bị',
    //   'Chọn tình trạng hiện tại',
    //   'Nhận kết quả định giá'
    // ];
    
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: List.generate(5, (i) {
        if (i.isEven) {
          final index = i ~/ 2;
          final active = _step >= index;
          return Expanded(
            flex: 6,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    color: active ? const Color(0xFFEA6C00) : Colors.white,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: active ? const Color(0xFFEA6C00) : const Color(0xFFE2E8F0),
                      width: 1,
                    ),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    '${index + 1}',
                    style: TextStyle(
                      color: active ? Colors.white : const Color(0xFFEA6C00),
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        titles[index],
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: active ? FontWeight.bold : FontWeight.w600,
                          color: active ? const Color(0xFFEA6C00) : Colors.grey.shade600,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      // Text(
                      //   subtitles[index],
                      //   style: TextStyle(
                      //     fontSize: 11,
                      //     color: Colors.grey.shade500,
                      //   ),
                      //   maxLines: 2,
                      //   overflow: TextOverflow.ellipsis,
                      // ),
                    ],
                  ),
                ),
              ],
            ),
          );
        } else {
          final leftIndex = (i - 1) ~/ 2;
          final completed = _step > leftIndex;
          return Expanded(
            flex: 1,
            child: Container(
              height: 2,
              margin: const EdgeInsets.only(top: 15, left: 4, right: 4),
              color: completed ? const Color(0xFFE2E8F0) : const Color(0xFFE2E8F0),
            ),
          );
        }
      }),
    );
  }

  Widget _buildNavigationBar(ThemeData theme) {
    return Column(
      children: [
        if (_errorMessage != null)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(
                color: const Color(0xFFFEF2F2),
                borderRadius: BorderRadius.circular(8)),
            child: Text(_errorMessage!,
                style: const TextStyle(color: Color(0xFFDC2626), fontSize: 13)),
          ),
        if (_successMessage != null)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(
                color: const Color(0xFFF0FDF4),
                borderRadius: BorderRadius.circular(8)),
            child: Text(_successMessage!,
                style: const TextStyle(color: Color(0xFF15803D), fontSize: 13)),
          ),
        Row(
          children: [
            if (_step > 0)
              Expanded(
                child: OutlinedButton(
                  onPressed: () => setState(() => _step = _step - 1),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    side: const BorderSide(color: Color(0xFFEA6C00)),
                    foregroundColor: const Color(0xFFEA6C00),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))
                  ),
                  child: const Text('Quay lại', style: TextStyle(fontWeight: FontWeight.w600)),
                ),
              ),
            if (_step > 0) const SizedBox(width: 12),
            Expanded(
              flex: 2,
              child: _step < 2
                  ? ElevatedButton(
                      onPressed: _nextEnabled() ? () => setState(() => _step = _step + 1) : null,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _nextEnabled() ? const Color(0xFFEA6C00) : const Color(0xFFCBD5E1),
                        foregroundColor: Colors.white,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: const [
                          Text('Tiếp tục', style: TextStyle(fontWeight: FontWeight.w600)),
                          SizedBox(width: 8),
                          Icon(Icons.arrow_forward, size: 18, color: Colors.white),
                        ],
                      ),
                    )
                  : ElevatedButton(
                      onPressed: (_isSubmitting || !_isStep1Valid()) ? null : _submitRequest,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFEA6C00),
                        disabledBackgroundColor: const Color(0xFFCBD5E1),
                        foregroundColor: Colors.white,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))
                      ),
                      child: _isSubmitting
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: const [
                                Icon(Icons.send, size: 18, color: Colors.white),
                                SizedBox(width: 8),
                                Text('Gửi yêu cầu thu cũ', style: TextStyle(fontWeight: FontWeight.w600)),
                              ],
                            ),
                    ),
            ),
          ],
        ),
        const SizedBox(height: 24),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.shield_outlined, size: 16, color: Colors.grey.shade500),
            const SizedBox(width: 6),
            Text('Thông tin của bạn được bảo mật tuyệt đối', style: TextStyle(color: Colors.grey.shade500, fontSize: 13))
          ],
        ),
        const SizedBox(height: 30),
      ],
    );
  }

  bool _nextEnabled() {
    if (_step == 0) return _isStep1Valid();
    if (_step == 1) return _selectedConditionIds.isNotEmpty;
    return false;
  }

  Widget _buildHeroCard(ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        const SizedBox(height: 10),
        RichText(
          textAlign: TextAlign.center,
          text:  TextSpan(
            style: TextStyle(fontSize: 25, fontWeight: FontWeight.bold, color: theme.colorScheme.onSurface),
            children: [
              TextSpan(text: 'Thu Cũ '),
              TextSpan(text: 'Đổi Mới', style: TextStyle(color: Color(0xFFEA6C00))),
              TextSpan(text: ' – Lên Đời Trợ Giá'),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Text(
          'Định giá máy cũ nhanh chóng, trợ giá lên tới 2 triệu đồng khi lên đời máy mới tại E-Tech Market.',
          textAlign: TextAlign.center,
          style: TextStyle(color: theme.colorScheme.onSurface, fontSize: 14, height: 1.5),
        ),
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _buildStepCard(ThemeData theme) {
    return const SizedBox.shrink();
  }

  Widget _buildStepItem(int step, String title) {
    return const SizedBox.shrink();
  }

  Widget _buildCategoryCard(ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: const Color(0xFFEA6C00), borderRadius: BorderRadius.circular(8)),
                child: const Icon(Icons.devices, color: Colors.white, size: 20),
              ),
              const SizedBox(width: 12),
              Text('Chọn loại thiết bị',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: theme.colorScheme.onSurface)),
            ],
          ),
          const SizedBox(height: 20),
          if (_isLoading)
            const Center(child: CircularProgressIndicator())
          else if (_categories.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Text('Hiện chưa có loại thiết bị để hiển thị.'),
            )
          else
            Row(
              children: _categories.map((category) {
                final isSelected = _selectedCategoryId == category['id'];
                return Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 6),
                    child: InkWell(
                      onTap: () => _selectCategory(category['id'] as int),
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 24),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.surface,
                          border: Border.all(
                              width: 0.5,
                              color: isSelected ? const Color(0xFFEA6C00) : theme.colorScheme.outline),
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: isSelected ? [BoxShadow(color: const Color(0xFFEA6C00).withOpacity(0.1), blurRadius: 8, offset: const Offset(0, 4))] : [],
                        ),
                        child: Column(
                          children: [
                            Icon(
                              category['slug'] == 'laptop'
                                  ? Icons.laptop_mac
                                  : Icons.phone_iphone,
                              color: isSelected ? const Color(0xFFEA6C00) : const Color(0xFF64748B),
                              size: 36,
                            ),
                            const SizedBox(height: 12),
                            Text(category['name'] ?? '',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                                    fontSize: 15,
                                    color: isSelected ? const Color(0xFFEA6C00) : const Color(0xFF475569))),
                          ],
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
      ],
    );
  }

  Widget _buildDetailsCard(ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
          Text('Thông tin chi tiết thiết bị',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: theme.colorScheme.onSurface)),
          const SizedBox(height: 20),
          _buildTextField('Tên máy', _machineNameCtrl, _selectedCategorySlug == 'dien-thoai' ? 'VD: iPhone 13 Pro Max...' : 'VD: MacBook Air M2 2022', required: true),
          
          if (_selectedCategorySlug == 'dien-thoai') ...[
            Row(
              children: [
                Expanded(child: _buildTextField('Dung lượng lưu trữ', _phoneStorageCtrl, 'VD: 256GB...', required: true)),
                const SizedBox(width: 12),
                Expanded(child: _buildTextField('Màu sắc', _phoneColorCtrl, 'VD: Xanh dương...', required: true)),
              ],
            )
          ] else if (_selectedCategorySlug == 'laptop') ...[
            Row(
              children: [
                Expanded(child: _buildTextField('Dung lượng RAM', _laptopRamCtrl, 'VD: 8GB, 16GB...', required: true)),
                const SizedBox(width: 12),
                Expanded(child: _buildTextField('Ổ cứng', _laptopDiskCtrl, 'VD: 512GB SSD...', required: true)),
              ],
            ),
            _buildTextField('Card màn hình (nếu có)', _laptopVgaCtrl, 'VD: NVIDIA RTX 3050...'),
          ],
          
          Row(
            children: [
              Expanded(child: _buildDropdownField('Tình trạng bảo hành', _warrantyCtrl, ['Còn bảo hành hãng', 'Hết bảo hành'])),
              const SizedBox(width: 12),
              Expanded(child: _buildTextField('Phụ kiện đi kèm', _accessoriesCtrl, 'VD: Sạc, cáp, hộp...')),
            ],
          ),
          
          const SizedBox(height: 4),
          Row(
            children: [
              Text('Tải ảnh máy lên ',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Theme.of(context).colorScheme.onSurface)),
              const Text('* ', style: TextStyle(color: Color(0xFFEA6C00), fontSize: 13)),
              Text('Tối đa 6 ảnh', style: TextStyle(color: Colors.grey.shade500, fontSize: 12, fontWeight: FontWeight.normal)),
            ],
          ),
          const SizedBox(height: 8),
          InkWell(
            onTap: _images.length >= 6 ? null : _pickImages,
            borderRadius: BorderRadius.circular(8),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 30),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Theme.of(context).colorScheme.onSurface, width:0.5),
                color: Theme.of(context).colorScheme.surface,
              ),
              child: Column(
                children: [
                  Icon(Icons.upload_file, size: 28, color: Theme.of(context).colorScheme.onSurface),
                  const SizedBox(height: 12),
                  Text('Chạm để tải ảnh lên', style: TextStyle(fontWeight: FontWeight.w500, color: Theme.of(context).colorScheme.onSurface, fontSize: 14)),
                  const SizedBox(height: 4),
                  Text('Hỗ trợ: JPG, PNG, WEBP (tối đa 10MB/ảnh)', style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurface)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          if (_images.isNotEmpty)
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: List.generate(_images.length, (index) {
                return Stack(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.file(
                        _images[index],
                        width: 80,
                        height: 80,
                        fit: BoxFit.cover,
                      ),
                    ),
                    Positioned(
                      top: 4,
                      right: 4,
                      child: GestureDetector(
                        onTap: () => _removeImage(index),
                        child: Container(
                          padding: const EdgeInsets.all(4),
                          decoration: BoxDecoration(color: Colors.black.withOpacity(0.6), shape: BoxShape.circle),
                          child: const Icon(Icons.close, color: Colors.white, size: 14),
                        ),
                      ),
                    ),
                  ],
                );
              }),
            ),
      ],
    );
  }
  
  Widget _buildDropdownField(String label, TextEditingController controller, List<String> options) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Theme.of(context).colorScheme.onSurface)),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            value: controller.text.isNotEmpty ? controller.text : null,
            isExpanded: true,
            decoration: InputDecoration(
              hintText: 'Chọn tình trạng',
              hintStyle: TextStyle(color: Theme.of(context).colorScheme.onSurface, fontSize: 14),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: Theme.of(context).colorScheme.onSurface, width:0.5)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: Theme.of(context).colorScheme.onSurface, width:0.5)),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: Theme.of(context).colorScheme.onSurface, width:0.5)),
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              isDense: true,
            ),
            items: options.map((String value) {
              return DropdownMenuItem<String>(
                value: value,
                child: Text(
                  value, 
                  style: TextStyle(fontSize: 14, color: Theme.of(context).colorScheme.onSurface),
                  overflow: TextOverflow.ellipsis,
                ),
              );
            }).toList(),
            onChanged: (newValue) {
              if (newValue != null) {
                controller.text = newValue;
              }
            },
          ),
        ],
      ),
    );
  }

  Widget _buildConditionCard(ThemeData theme) {
    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
       
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: const Color(0xFFEA6C00), borderRadius: BorderRadius.circular(8)),
                child: const Icon(Icons.health_and_safety, color: Colors.white, size: 20),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Tình trạng máy',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: theme.colorScheme.onSurface)),
                  const SizedBox(height: 2),
                  Text('Vui lòng chọn tình trạng hiện tại của máy',
                      style: TextStyle(color: theme.colorScheme.onSurface, fontSize: 12)),
                ],
              ),
            ],
          ),
          const SizedBox(height: 20),
          if (_isLoadingConditions)
            const Center(child: Padding(padding: EdgeInsets.all(20), child: CircularProgressIndicator()))
          else if (_conditions.isEmpty)
            const Text('Vui lòng chọn loại thiết bị trước.', style: TextStyle(color: Color(0xFF64748B)))
          else
            _buildConditionGroups(),
        ],
      ),
    );
  }
  
  Widget _buildConditionGroups() {
    final Map<String, List<Map<String, dynamic>>> groups = {
        'Ngoại hình': [],
        'Màn hình & Kính': [],
        'Pin & Sạc': [],
        'Camera & Âm thanh': [],
        'Chức năng & Kết nối': [],
        'Phần cứng & Sửa chữa': [],
        'Khác': []
    };

    final seen = <String>{};
    for (var c in _conditions) {
      final nameStr = c['name']?.toString() ?? '';
      final key = nameStr.trim().toLowerCase();
      if (seen.contains(key)) continue;
      seen.add(key);

      if (key.contains('màn hình') || key.contains('hiển thị') || key.contains('cảm ứng') || key.contains('ám') || key.contains('sọc') || key.contains('mực') || key.contains('điểm chết') || key.contains('lưu ảnh') || key.contains('chấm sáng') || key.contains('hở sáng') || key.contains('bụi trong màn') || key.contains('true tone') || key.contains('ép kính') || (key.contains('kính') && !key.contains('camera'))) {
          groups['Màn hình & Kính']!.add(c);
      } else if (key.contains('pin') || key.contains('sạc') || key.contains('cổng')) {
          groups['Pin & Sạc']!.add(c);
      } else if (key.contains('camera') || key.contains('loa') || key.contains('mic') || key.contains('âm thanh') || key.contains('flash') || key.contains('đốm') || key.contains('chụp')) {
          groups['Camera & Âm thanh']!.add(c);
      } else if (key.contains('rung') || key.contains('face id') || key.contains('touch id') || key.contains('vân tay') || key.contains('nút') || key.contains('wifi') || key.contains('bluetooth') || key.contains('gps') || key.contains('nfc') || key.contains('esim') || key.contains('sóng') || key.contains('5g') || key.contains('cảm biến') || key.contains('la bàn') || key.contains('gia tốc') || key.contains('con quay') || key.contains('nhận sim')) {
          groups['Chức năng & Kết nối']!.add(c);
      } else if (key.contains('main') || key.contains('ic') || key.contains('sửa chữa') || key.contains('tháo máy') || key.contains('nước') || key.contains('oxy hóa') || key.contains('nguồn') || key.contains('treo logo') || key.contains('chống nước')) {
          groups['Phần cứng & Sửa chữa']!.add(c);
      } else if (key.contains('mới') || key.contains('đẹp') || key.contains('khá') || key.contains('trầy') || key.contains('xước') || key.contains('tróc') || key.contains('cấn') || key.contains('móp') || key.contains('cong') || key.contains('vỏ') || key.contains('khung') || key.contains('lưng') || key.contains('logo') || key.contains('ốc') || key.contains('sim')) {
          groups['Ngoại hình']!.add(c);
      } else {
          groups['Khác']!.add(c);
      }
    }
    
    List<Widget> columnChildren = [];
    
    for (final entry in groups.entries) {
      if (entry.value.isEmpty) continue;
      
      columnChildren.add(
        Padding(
          padding: const EdgeInsets.only(bottom: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(width: 4, height: 16, decoration: BoxDecoration(color: Theme.of(context).colorScheme.primary, borderRadius: BorderRadius.circular(4))),
                  const SizedBox(width: 8),
                  Text(entry.key, style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface)),
                ],
              ),
              const Divider(color: Color(0xFFE2E8F0), height: 24),
              ...entry.value.map((condition) {
                final isSelected = _selectedConditionIds.contains(condition['id']);
                return InkWell(
                  onTap: () => _toggleCondition(condition['id'] as int),
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.surface,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                          color: isSelected ? const Color(0xFFEA6C00) : Theme.of(context).colorScheme.surface, width: isSelected ? 1.5 : 1),
                      boxShadow: isSelected ? [BoxShadow(color: const Color(0xFFEA6C00).withOpacity(0.05), blurRadius: 4, offset: const Offset(0, 2))] : [],
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 18,
                          height: 18,
                          margin: const EdgeInsets.only(top: 2),
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(color: isSelected ? const Color(0xFFEA6C00) : Theme.of(context).colorScheme.onSurface, width: isSelected ? 5 : 1.5),
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(condition['name'] ?? '',
                                  style: TextStyle(
                                      fontWeight: FontWeight.w600,
                                      fontSize: 13.5,
                                      color: isSelected ? const Color(0xFFEA6C00) : Theme.of(context).colorScheme.onSurface)),
                              if ((condition['description'] ?? '').toString().isNotEmpty)
                                Padding(
                                  padding: const EdgeInsets.only(top: 4),
                                  child: Text(condition['description'] ?? '',
                                      style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurface)),
                                ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ],
          ),
        ),
      );
    }
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: columnChildren,
    );
  }

  Widget _buildContactCard(ThemeData theme) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
       
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: const Color(0xFFEA6C00), borderRadius: BorderRadius.circular(8)),
                child: const Icon(Icons.person, color: Colors.white, size: 20),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Thông tin liên hệ',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface)),
                  const SizedBox(height: 2),
                  Text('Nhận kết quả định giá qua email và điện thoại',
                      style: TextStyle(color: Theme.of(context).colorScheme.onSurface, fontSize: 12)),
                ],
              ),
            ],
          ),
          const SizedBox(height: 24),
          _buildTextField('Họ và tên', _customerNameCtrl, 'Nhập họ và tên của bạn', required: true),
          _buildTextField('Số điện thoại', _customerPhoneCtrl, 'Nhập số điện thoại liên hệ', required: true),
          _buildTextField('Email', _customerEmailCtrl, 'Nhập địa chỉ email', required: true),
          
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0))
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: const [
                    Icon(Icons.security, color: Color(0xFF10B981), size: 18),
                    SizedBox(width: 8),
                    Text('Cam kết bảo mật thông tin', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF1E293B))),
                  ],
                ),
                const SizedBox(height: 8),
                const Text('E-Tech Market cam kết bảo mật tuyệt đối thông tin cá nhân của bạn và chỉ sử dụng để liên hệ về kết quả định giá.', style: TextStyle(fontSize: 12, color: Color(0xFF475569))),
                const SizedBox(height: 12),
                _buildSecurityLine('Thông tin của bạn được mã hóa và bảo vệ an toàn'),
                _buildSecurityLine('Không chia sẻ thông tin cho bên thứ ba'),
                _buildSecurityLine('Chỉ liên hệ khi có kết quả định giá'),
              ],
            ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildSecurityLine(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.check, size: 16, color: Color(0xFF10B981)),
          const SizedBox(width: 8),
          Expanded(child: Text(text, style: const TextStyle(fontSize: 12, color: Color(0xFF475569)))),
        ],
      ),
    );
  }

  Widget _buildSubmitButton(ThemeData theme) {
    return const SizedBox.shrink(); // Combined into Navigation Bar
  }

  Widget _buildTextField(String label, TextEditingController controller, String hint, {bool required = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(label, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Theme.of(context).colorScheme.onSurface)),
              if (required) const Text(' *', style: TextStyle(color: Color(0xFFEA6C00), fontSize: 13)),
            ],
          ),
          const SizedBox(height: 8),
          TextFormField(
            controller: controller,
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: Theme.of(context).colorScheme.onSurface, width:0.5)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: Theme.of(context).colorScheme.onSurface, width:0.5)),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: Theme.of(context).colorScheme.onSurface, width:0.5)),
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              isDense: true,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTradeInProcess(ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'QUY TRÌNH THU CŨ',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 16),
        _buildProcessStep(
          step: '01',
          title: 'Khách hàng tạo đơn',
          description: 'Điền đầy đủ thông tin thiết bị, tải ảnh tình trạng máy và gửi yêu cầu định giá trên hệ thống.',
          color: const Color(0xFFEA6C00),
          icon: Icons.edit_document,
        ),
        _buildProcessStep(
          step: '02',
          title: 'Tiếp nhận dữ liệu',
          description: 'Hệ thống và chuyên viên sẽ ghi nhận yêu cầu, tiến hành kiểm tra tính hợp lệ của các thông tin được cung cấp.',
          color: const Color(0xFFEAB308),
          icon: Icons.data_usage,
        ),
        _buildProcessStep(
          step: '03',
          title: 'Định giá chuẩn xác',
          description: 'Thiết bị được đánh giá minh bạch dựa trên tình trạng thực tế để đưa ra mức giá thu mua cạnh tranh nhất.',
          color: const Color(0xFF22C55E),
          icon: Icons.price_check,
        ),
        _buildProcessStep(
          step: '04',
          title: 'Phê duyệt yêu cầu',
          description: 'Đơn yêu cầu được xét duyệt nhanh chóng. Mọi quyết định đồng ý hay từ chối đều đi kèm lý do rõ ràng.',
          color: const Color(0xFF3B82F6),
          icon: Icons.check_circle,
        ),
        _buildProcessStep(
          step: '05',
          title: 'Nhận kết quả qua Email',
          description: 'Nhận ngay thông báo kết quả thẩm định, mức giá chính thức và hướng dẫn các bước tiếp theo qua email của bạn.',
          color: const Color(0xFFA855F7),
          icon: Icons.email,
          isLast: true,
        ),
      ],
    );
  }

  Widget _buildProcessStep({
    required String step,
    required String title,
    required String description,
    required Color color,
    required IconData icon,
    bool isLast = false,
  }) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Column(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Text(
                    step,
                    style: TextStyle(
                      color: color,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ),
              ),
              if (!isLast)
                Expanded(
                  child: Container(
                    width: 2,
                    color: color.withOpacity(0.3),
                  ),
                ),
            ],
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(icon, color: color, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          title,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    description,
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.onSurface.withOpacity(0.7),
                      fontSize: 13,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCommitments(ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.shield, color: Color(0xFFEA6C00)),
            const SizedBox(width: 8),
            const Text(
              'CAM KẾT TỪ E-TECH MARKET',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            _buildCommitmentItem('Thông tin bảo mật', 'Bảo mật tuyệt đối thông tin cá nhân và thiết bị.', Icons.lock),
            _buildCommitmentItem('Định giá minh bạch', 'Định giá đúng giá trị thật của thiết bị.', Icons.visibility),
            _buildCommitmentItem('Không ép giá', 'Nói không với ép giá, mua bán rõ ràng.', Icons.handshake),
            _buildCommitmentItem('Xử lý nhanh chóng', 'Tiếp nhận và phản hồi trong 30 phút.', Icons.speed),
            _buildCommitmentItem('Hỗ trợ tận tâm', 'Đội ngũ tư vấn nhiệt tình, hỗ trợ 24/7.', Icons.support_agent),
            _buildCommitmentItem('Thu cũ đổi mới', 'Trợ giá hấp dẫn khi lên đời sản phẩm.', Icons.autorenew),
          ],
        ),
      ],
    );
  }

  Widget _buildCommitmentItem(String title, String desc, IconData icon) {
    return LayoutBuilder(builder: (context, constraints) {
      return Container(
        width: (MediaQuery.of(context).size.width - 32 - 12) / 2, // 2 columns
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Theme.of(context).colorScheme.outline, width: 0.5),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: Colors.orange, size: 24),
            const SizedBox(height: 8),
            Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
            const SizedBox(height: 4),
            Text(desc, style: TextStyle(fontSize: 11, color: Theme.of(context).colorScheme.onSurface.withOpacity(0.7))),
          ],
        ),
      );
    });
  }

  Widget _buildImportantNotes(ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.notifications_active, color: Color(0xFFEAB308)),
            const SizedBox(width: 8),
            const Text(
              'LƯU Ý QUAN TRỌNG',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFFEFF6FF), // Light blue background
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFBFDBFE)),
          ),
          child: Column(
            children: [
              _buildNoteItem('Thông tin bạn cung cấp càng chi tiết, việc định giá càng chính xác.'),
              _buildNoteItem('Thiết bị phải thuộc quyền sở hữu hợp pháp của bạn.'),
              _buildNoteItem('Chúng tôi có quyền từ chối thu mua nếu thiết bị không đủ điều kiện.'),
              _buildNoteItem('Mọi thông tin của bạn được bảo mật tuyệt đối.'),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildNoteItem(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.check_circle, color: Color(0xFF2563EB), size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(fontSize: 13, color: Color(0xFF1E3A8A)),
            ),
          ),
        ],
      ),
    );
  }
}

