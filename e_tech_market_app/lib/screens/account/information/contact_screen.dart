import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../utils/app_snackbar.dart';
import '../../../config/dio_client.dart';

const String _fallbackStoreName = 'E-Tech Market';
const String _fallbackPhone = '1900 8888';
const String _fallbackEmail = 'support@etechmarket.vn';
const String _fallbackAddress = 'Số 123 Đường Công Nghệ, Quận 1, TP. Hồ Chí Minh';

class ContactScreen extends StatefulWidget {
  const ContactScreen({super.key});

  @override
  State<ContactScreen> createState() => _ContactScreenState();
}

class _ContactScreenState extends State<ContactScreen> {
  // Store info
  Map<String, dynamic>? _storeContact;
  bool _loadingInfo = true;

  // Form
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _messageCtrl = TextEditingController();
  String _subject = 'Hỗ trợ kỹ thuật';
  bool _submitting = false;

  final _subjects = ['Hỗ trợ kỹ thuật', 'Đổi trả / Bảo hành', 'Thanh toán / Đơn hàng', 'Hợp tác / Doanh nghiệp'];

  @override
  void initState() {
    super.initState();
    _loadStoreContact();
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _phoneCtrl.dispose();
    _messageCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadStoreContact() async {
    try {
      final res = await DioClient.instance.get('/store/contact');
      if (mounted && res.statusCode == 200) {
        setState(() {
          _storeContact = res.data;
          _loadingInfo = false;
        });
      } else {
        if (mounted) setState(() => _loadingInfo = false);
      }
    } catch (_) {
      if (mounted) setState(() => _loadingInfo = false);
    }
  }

  String get _displayName => (_storeContact?['store_name']?.toString().trim().isNotEmpty == true)
      ? _storeContact!['store_name']
      : _fallbackStoreName;
  String get _displayPhone => (_storeContact?['contact_phone']?.toString().trim().isNotEmpty == true)
      ? _storeContact!['contact_phone']
      : _fallbackPhone;
  String get _displayEmail => (_storeContact?['contact_email']?.toString().trim().isNotEmpty == true)
      ? _storeContact!['contact_email']
      : _fallbackEmail;
  String get _displayAddress => (_storeContact?['warehouse_address']?.toString().trim().isNotEmpty == true)
      ? _storeContact!['warehouse_address']
      : _fallbackAddress;

  Future<void> _submitForm() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _submitting = true);
    try {
      final res = await DioClient.instance.post(
        '/contact/messages',
        data: {
          'name': _nameCtrl.text.trim(),
          'email': _emailCtrl.text.trim(),
          'phone': _phoneCtrl.text.trim(),
          'subject': _subject,
          'message': _messageCtrl.text.trim(),
        },
      );

      if (!mounted) return;
      if (res.statusCode == 201 || res.statusCode == 200) {
        _messageCtrl.clear();
        AppSnackBar.showSuccess(context, 'Đã gửi liên hệ! Chúng tôi sẽ phản hồi bạn sớm.');
      }
    } on DioException catch (e) {
      if (!mounted) return;
      final data = e.response?.data;
      if (data is Map && data['message'] != null) {
        AppSnackBar.showError(context, data['message'].toString());
      } else {
        AppSnackBar.showError(context, 'Gửi liên hệ thất bại. Vui lòng thử lại.');
      }
    } catch (e) {
      if (mounted) AppSnackBar.showError(context, 'Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _launchUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      appBar: AppBar(
        title: const Text('Liên hệ & Hỗ trợ', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        backgroundColor: Theme.of(context).colorScheme.surface,
        foregroundColor: Theme.of(context).colorScheme.onSurface,
        elevation: 1,
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Hero Banner
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 24),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFFF26522), Color(0xFFFF9F6E)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: Column(
                children: [
                  const Icon(Icons.support_agent, size: 56, color: Colors.white),
                  const SizedBox(height: 14),
                  Text(
                    'Đội ngũ chuyên gia $_displayName\nluôn sẵn sàng hỗ trợ bạn!',
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold, height: 1.4),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Liên hệ ngay để được tư vấn và hỗ trợ nhanh nhất.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.white.withOpacity(0.88), fontSize: 13),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Store Contact Info
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(color: Theme.of(context).colorScheme.surface, borderRadius: BorderRadius.circular(5)),
                child: _loadingInfo
                    ? const Center(child: Padding(padding: EdgeInsets.all(16), child: CircularProgressIndicator(color: Color(0xFFF26522))))
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Thông tin liên hệ', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                          const Divider(height: 24),
                          _buildInfoRow(Icons.phone_outlined, const Color(0xFF16A34A), 'Số hotline', _displayPhone, () => _launchUrl('tel:${_displayPhone.replaceAll(' ', '')}')),
                          const SizedBox(height: 14),
                          _buildInfoRow(Icons.email_outlined, const Color(0xFF2563EB), 'Email hỗ trợ', _displayEmail, () => _launchUrl('mailto:$_displayEmail')),
                          const SizedBox(height: 14),
                          _buildInfoRow(Icons.location_on_outlined, const Color(0xFFDC2626), 'Địa chỉ trụ sở', _displayAddress, null),
                        ],
                      ),
              ),
            ),

            const SizedBox(height: 20),

            // Contact Form
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(color: Theme.of(context).colorScheme.surface, borderRadius: BorderRadius.circular(5),  border: Border.all(color: Theme.of(context).colorScheme.outline, width: 0.5,)),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Gửi tin nhắn cho chúng tôi', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      const SizedBox(height: 4),
                      Text('Hãy để lại thông tin, chúng tôi sẽ phản hồi trong vòng 24 giờ.', style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                      const SizedBox(height: 20),

                      _buildField('Họ và tên', 'Nguyễn Văn A', _nameCtrl, validator: (v) => v!.trim().length < 2 ? 'Tên tối thiểu 2 ký tự' : null),
                      const SizedBox(height: 14),
                      _buildField('Địa chỉ Email', 'example@email.com', _emailCtrl, keyboardType: TextInputType.emailAddress,
                          validator: (v) => !RegExp(r'^[^@]+@[^@]+\.[^@]+').hasMatch(v ?? '') ? 'Email không hợp lệ' : null),
                      const SizedBox(height: 14),
                      _buildField('Số điện thoại', '0901 234 567', _phoneCtrl, keyboardType: TextInputType.phone,
                          validator: (v) => v!.trim().length < 6 ? 'Số điện thoại không hợp lệ' : null),
                      const SizedBox(height: 14),

                      // Subject Dropdown
                      DropdownButtonFormField<String>(
                        value: _subject,
                        decoration: InputDecoration(
                          labelText: 'Chủ đề',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: Colors.grey.shade300)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        ),
                        items: _subjects.map((s) => DropdownMenuItem(value: s, child: Text(s, style: const TextStyle(fontSize: 14)))).toList(),
                        onChanged: (v) => setState(() => _subject = v ?? _subject),
                      ),
                      const SizedBox(height: 14),

                      // Message
                      TextFormField(
                        controller: _messageCtrl,
                        maxLines: 5,
                        decoration: InputDecoration(
                          labelText: 'Nội dung tin nhắn',
                          hintText: 'Bạn cần chúng tôi giúp điều gì?',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: Colors.grey.shade300)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          alignLabelWithHint: true,
                        ),
                        validator: (v) => v!.trim().length < 5 ? 'Vui lòng nhập nội dung (tối thiểu 5 ký tự)' : null,
                      ),
                      const SizedBox(height: 20),

                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: _submitting ? null : _submitForm,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFF26522),
                            foregroundColor: Colors.white,
                            elevation: 0,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: _submitting
                              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                              : const Text('Gửi yêu cầu', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, Color color, String label, String value, VoidCallback? onTap) {
    final content = Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
          child: Icon(icon, color: color, size: 20),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
              const SizedBox(height: 4),
              Text(value, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, height: 1.4)),
            ],
          ),
        ),
        if (onTap != null) const Icon(Icons.arrow_forward_ios, size: 14, color: Colors.grey),
      ],
    );

    if (onTap != null) {
      return InkWell(onTap: onTap, borderRadius: BorderRadius.circular(10), child: content);
    }
    return content;
  }

  Widget _buildField(String label, String hint, TextEditingController ctrl, {TextInputType? keyboardType, String? Function(String?)? validator}) {
    return TextFormField(
      controller: ctrl,
      keyboardType: keyboardType,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        hintStyle: const TextStyle(color: Colors.grey, fontSize: 13),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: Colors.grey.shade300)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      ),
      validator: validator,
    );
  }
}
