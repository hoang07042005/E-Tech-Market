import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import '../../../services/auth_service.dart';
import '../../../utils/network_utils.dart';

class EditProfileScreen extends StatefulWidget {
  final Map<String, dynamic> user;

  const EditProfileScreen({super.key, required this.user});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;
  String? _errorMessage;

  late TextEditingController _nameCtrl;
  late TextEditingController _phoneCtrl;
  late TextEditingController _emailCtrl;
  late TextEditingController _addressCtrl;
  late TextEditingController _wardCtrl;
  late TextEditingController _districtCtrl;
  late TextEditingController _provinceCtrl;

  File? _avatarFile;
  String? _avatarNetworkUrl;

  @override
  void initState() {
    super.initState();
    _nameCtrl = TextEditingController(text: widget.user['name']?.toString() ?? '');
    _phoneCtrl = TextEditingController(text: widget.user['phone']?.toString() ?? '');
    _emailCtrl = TextEditingController(text: widget.user['email']?.toString() ?? '');
    _addressCtrl = TextEditingController(text: widget.user['address_line']?.toString() ?? '');
    _wardCtrl = TextEditingController(text: widget.user['ward']?.toString() ?? '');
    _districtCtrl = TextEditingController(text: widget.user['district']?.toString() ?? '');
    _provinceCtrl = TextEditingController(text: widget.user['province']?.toString() ?? '');

    final rawUrl = widget.user['avatar_url']?.toString() ?? '';
    if (rawUrl.isNotEmpty) {
      _avatarNetworkUrl = NetworkUtils.fixDeviceUrl(rawUrl);
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _emailCtrl.dispose();
    _addressCtrl.dispose();
    _wardCtrl.dispose();
    _districtCtrl.dispose();
    _provinceCtrl.dispose();
    super.dispose();
  }

  String _getAvatarInitial() {
    final name = _nameCtrl.text.trim();
    if (name.isEmpty) return 'U';
    final parts = name.split(' ');
    final lastName = parts.last;
    if (lastName.isEmpty) return 'U';
    return lastName[0].toUpperCase();
  }

  Future<void> _pickAvatar() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: ImageSource.gallery, maxWidth: 512, maxHeight: 512, imageQuality: 80);
    if (picked != null) {
      setState(() {
        _avatarFile = File(picked.path);
      });
    }
  }

  Future<void> _uploadAvatar(String token) async {
    if (_avatarFile == null) return;

    const baseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'http://192.168.24.17:8000/api');
    final uri = Uri.parse('$baseUrl/me/avatar');

    final request = http.MultipartRequest('POST', uri)
      ..headers['Authorization'] = 'Bearer $token'
      ..headers['Accept'] = 'application/json'
      ..files.add(await http.MultipartFile.fromPath('file', _avatarFile!.path));

    final streamed = await request.send();
    if (streamed.statusCode < 200 || streamed.statusCode >= 300) {
      final body = await streamed.stream.bytesToString();
      debugPrint('Avatar upload failed: $body');
    }
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final token = await AuthService.getToken();
      if (token == null) throw Exception('Vui lòng đăng nhập lại.');

      // Upload avatar first if selected
      await _uploadAvatar(token);

      const baseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'http://192.168.24.17:8000/api');
      final uri = Uri.parse('$baseUrl/me');

      final response = await http.patch(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'name': _nameCtrl.text.trim(),
          'email': _emailCtrl.text.trim(),
          'phone': _phoneCtrl.text.trim().isEmpty ? null : _phoneCtrl.text.trim(),
          'address_line': _addressCtrl.text.trim().isEmpty ? null : _addressCtrl.text.trim(),
          'ward': _wardCtrl.text.trim().isEmpty ? null : _wardCtrl.text.trim(),
          'district': _districtCtrl.text.trim().isEmpty ? null : _districtCtrl.text.trim(),
          'province': _provinceCtrl.text.trim().isEmpty ? null : _provinceCtrl.text.trim(),
        }),
      );

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final decoded = jsonDecode(response.body);
        final updatedUser = decoded['user'] ?? decoded; 
        
        // Save to local session
        await AuthService.saveSession(token: token, user: updatedUser);

        if (mounted) {
          Navigator.pop(context, true);
        }
      } else {
        final body = jsonDecode(response.body);
        throw Exception(body['message'] ?? 'Không thể cập nhật hồ sơ.');
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString().replaceFirst('Exception: ', '');
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Sửa hồ sơ', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 18)),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
        centerTitle: true,
      ),
      body: Container(
        color: const Color(0xFFFAF1EB),
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              if (_errorMessage != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.red.shade200),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.error_outline, color: Colors.red.shade700, size: 20),
                      const SizedBox(width: 8),
                      Expanded(child: Text(_errorMessage!, style: TextStyle(color: Colors.red.shade800, fontSize: 13))),
                    ],
                  ),
                ),

              // Avatar picker
              Center(
                child: GestureDetector(
                  onTap: _pickAvatar,
                  child: Stack(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(color: Colors.black.withOpacity(0.08), blurRadius: 12, offset: const Offset(0, 4)),
                          ],
                        ),
                        child: CircleAvatar(
                          radius: 50,
                          backgroundColor: const Color(0xFFEF7A45),
                          backgroundImage: _avatarFile != null
                              ? FileImage(_avatarFile!)
                              : (_avatarNetworkUrl != null ? NetworkImage(_avatarNetworkUrl!) : null) as ImageProvider?,
                          onBackgroundImageError: (_avatarFile != null || _avatarNetworkUrl != null) ? (_, __) {} : null,
                          child: (_avatarFile == null && _avatarNetworkUrl == null)
                              ? Text(
                                  _getAvatarInitial(),
                                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 36),
                                )
                              : null,
                        ),
                      ),
                      Positioned(
                        bottom: 2,
                        right: 2,
                        child: Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF26522),
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 2.5),
                          ),
                          child: const Icon(Icons.camera_alt, color: Colors.white, size: 16),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 8),
              const Center(
                child: Text('Nhấn để thay đổi ảnh đại diện', style: TextStyle(color: Colors.grey, fontSize: 12)),
              ),
              const SizedBox(height: 24),

              // Form fields inside a white card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 10, offset: const Offset(0, 4)),
                  ],
                ),
                child: Column(
                  children: [
                    _buildTextField('Họ và tên', _nameCtrl, icon: Icons.person_outline, required: true),
                    const SizedBox(height: 16),
                    _buildTextField('Email', _emailCtrl, icon: Icons.email_outlined, required: true, keyboardType: TextInputType.emailAddress),
                    const SizedBox(height: 16),
                    _buildTextField('Số điện thoại', _phoneCtrl, icon: Icons.phone_outlined, keyboardType: TextInputType.phone),
                    const SizedBox(height: 16),
                    _buildTextField('Địa chỉ', _addressCtrl, icon: Icons.location_on_outlined),
                    const SizedBox(height: 16),
                    _buildTextField('Phường / Xã', _wardCtrl, icon: Icons.location_city_outlined),
                    const SizedBox(height: 16),
                    _buildTextField('Quận / Huyện', _districtCtrl, icon: Icons.map_outlined),
                    const SizedBox(height: 16),
                    _buildTextField('Tỉnh / Thành phố', _provinceCtrl, icon: Icons.flag_outlined),
                  ],
                ),
              ),
              const SizedBox(height: 28),
              
              SizedBox(
                height: 52,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _saveProfile,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFF26522),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: _isLoading
                      ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Text('Lưu thông tin', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                ),
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTextField(String label, TextEditingController controller, {bool required = false, TextInputType? keyboardType, IconData? icon}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF1E293B), fontSize: 13)),
        const SizedBox(height: 8),
        TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          decoration: InputDecoration(
            prefixIcon: icon != null ? Icon(icon, color: const Color(0xFFC45A1A), size: 20) : null,
            filled: true,
            fillColor: const Color(0xFFFAF5F0),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFFF26522), width: 1.5),
            ),
          ),
          validator: (value) {
            if (required && (value == null || value.trim().isEmpty)) {
              return 'Không được để trống';
            }
            return null;
          },
        ),
      ],
    );
  }
}
