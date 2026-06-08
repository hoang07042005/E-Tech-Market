import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../../../config/api_config.dart';

const Color _accent = Color(0xFFF97316);

class PaymentSecurityPolicyScreen extends StatefulWidget {
  const PaymentSecurityPolicyScreen({super.key});

  

  @override
  State<PaymentSecurityPolicyScreen> createState() => _PaymentSecurityPolicyScreenState();
}

class _PaymentSecurityPolicyScreenState extends State<PaymentSecurityPolicyScreen> {


  static const String _baseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: ApiConfig.apiBaseUrl);

  Map<String, dynamic>? _storeContact;

  @override
  void initState() {
    super.initState();
    _loadStoreContact();
  }

  Future<void> _loadStoreContact() async {
    try {
      final res = await http.get(Uri.parse('$_baseUrl/store/contact'));
      if (mounted && res.statusCode == 200) {
        setState(() {
          _storeContact = jsonDecode(res.body);
        });
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Chính sách bảo mật thanh toán'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
      ),
      body: Container(
        color: const Color(0xFFF7F4F0),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 6),
                      Text('Chính sách bảo mật thanh toán', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF111827))),
                      const SizedBox(height: 6),
                      const Text('Cập nhật lần cuối: 25 tháng 5, 2026', style: TextStyle(fontSize: 13, color: Color(0xFF6B7280))),
                      const SizedBox(height: 12),
                    ],
                  ),
                ),

                const SizedBox(height: 18),

                _Section(
                  number: '1.',
                  title: 'Cam kết bảo mật',
                  children: [
                    const Text('Tại E-Tech Market Official, chúng tôi nỗ lực trong mọi tình huống để quyền lợi của quý khách luôn được giữ an toàn. Chúng tôi cam kết không chia sẻ thông tin thanh toán của khách hàng cho bất kỳ bên thứ ba nào, ngoại trừ các đối tác thanh toán được cấp phép.'),
                    const SizedBox(height: 8),
                    const Text('Mọi giao dịch đều được mã hóa và bảo vệ bằng các tiêu chuẩn bảo mật cao nhất hiện nay.'),
                  ],
                ),

                const SizedBox(height: 12),

                _Section(
                  number: '2.',
                  title: 'Phương thức thanh toán an toàn',
                  children: [
                    _PaymentBox(title: 'Cổng thanh toán Momo', description: 'Mã hóa đa lớp, xác thực OTP, bảo vệ tuyệt đối thông tin tài khoản.'),
                    const SizedBox(height: 10),
                    _PaymentBox(title: 'Tiêu chuẩn 3D Secure', description: 'Áp dụng cho thẻ Visa/Master/JCB. Xác thực chủ thẻ qua OTP hoặc Smart OTP.'),
                    const SizedBox(height: 10),
                    const Text('Đối tác thanh toán uy tín: Momo · VNPAY · Banking/InternetBanking', style: TextStyle(color: Color(0xFF6B7280))),
                  ],
                ),

                const SizedBox(height: 12),

                _Section(
                  number: '3.',
                  title: 'Thu thập và Xử lý thông tin',
                  children: [
                    const Text('Trong quá trình thanh toán, chúng tôi chỉ thu thập các thông tin sau:'),
                    const SizedBox(height: 8),
                    const _BulletList(items: [
                      'Họ tên chủ thẻ/thông tin tài khoản ví điện tử',
                      'Số điện thoại liên hệ xác thực',
                      'Chi tiết giao dịch (mã đơn hàng, số tiền, thời gian...)',
                    ]),
                    const SizedBox(height: 10),
                    const _AlertBox(text: 'Lưu ý: E-Tech Market không lưu trữ thông tin thẻ (số thẻ, CVV/CVC) của khách hàng trên hệ thống. Mọi dữ liệu nhạy cảm được xử lý trực tiếp qua cổng thanh toán bảo mật của đối tác.'),
                  ],
                ),

                const SizedBox(height: 12),

                _Section(
                  number: '4.',
                  title: 'Quyền và Trách nhiệm của khách hàng',
                  children: [
                    const _BulletList(items: [
                      'Khách hàng cần kiểm tra kỹ thông tin trước khi xác nhận thanh toán.',
                      'Không chia sẻ mã OTP, thông tin thẻ cho bất kỳ ai kể cả nhân viên E-Tech Market Official.',
                      'Thông báo ngay cho E-Tech Market Official khi phát hiện giao dịch bất thường qua hotline hoặc email bảo mật bên dưới.',
                    ]),
                    const SizedBox(height: 12),
                    _ContactBox(
                      hotline: _storeContact?['contact_phone']?.toString().trim().isNotEmpty == true ? _storeContact!['contact_phone'] : '1900 8888',
                      email: _storeContact?['contact_email']?.toString().trim().isNotEmpty == true ? _storeContact!['contact_email'] : 'support@etechmarket.vn',
                    ),
                  ],
                ),

                const SizedBox(height: 28),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Section extends StatelessWidget {
  final String number;
  final String title;
  final List<Widget> children;

  const _Section({required this.number, required this.title, required this.children});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF7ED),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(number, style: const TextStyle(color: Color(0xFFF97316), fontWeight: FontWeight.bold)),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: Color(0xFF1F2937)),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.all(12),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: children),
        ),
      ],
    );
  }
}

class _PaymentBox extends StatelessWidget {
  final String title;
  final String description;

  const _PaymentBox({required this.title, required this.description});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF3C7),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFDE68A)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title, style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF92400E))),
        const SizedBox(height: 8),
        Text(description, style: const TextStyle(color: Color(0xFF92400E))),
      ]),
    );
  }
}

class _BulletList extends StatelessWidget {
  final List<String> items;
  const _BulletList({required this.items});
  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: items.map((t) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('• ', style: TextStyle(fontSize: 18)),
          Expanded(child: Text(t)),
        ]),
      )).toList(),
    );
  }
}

class _AlertBox extends StatelessWidget {
  final String text;
  const _AlertBox({required this.text});
  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFEE2E2),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFFECACA)),
      ),
      child: Text(text, style: const TextStyle(color: Color(0xFF991B1B))),
    );
  }
}

class _ContactBox extends StatelessWidget {
  final String hotline;
  final String email;
  const _ContactBox({required this.hotline, required this.email});
  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF4F8FA),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE6EEF2)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Liên hệ hỗ trợ an ninh', style: TextStyle(fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        const Text('Hotline bảo mật', style: TextStyle(color: Color(0xFF6B7280), fontSize: 12)),
        Text(hotline, style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFFF97316))),
        const SizedBox(height: 8),
        const Text('Email Chuyên Trách', style: TextStyle(color: Color(0xFF6B7280), fontSize: 12)),
        Text(email, style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF1F2937))),
      ]),
    );
  }
}
