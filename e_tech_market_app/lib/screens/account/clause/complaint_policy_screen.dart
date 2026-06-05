import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

const Color _accent = Color(0xFF7C2E00);

class ComplaintPolicyScreen extends StatefulWidget {
  const ComplaintPolicyScreen({super.key});

  

  @override
  State<ComplaintPolicyScreen> createState() => _ComplaintPolicyScreenState();
}

class _ComplaintPolicyScreenState extends State<ComplaintPolicyScreen> {



  static const String _baseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'http://192.168.24.14:8000/api');

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
        title: const Text('Chính sách khiếu nại'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
      ),
      body: Container(
        color: const Color(0xFFF7F4F0),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Hero card
                Container(
                //   decoration: BoxDecoration(
                //     color: Colors.white,
                //     borderRadius: BorderRadius.circular(18),
                //   ),
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        // decoration: BoxDecoration(
                        //   color: const Color(0xFFFFF7ED),
                        //   borderRadius: BorderRadius.circular(999),
                        // ),
                        child: const Text('CAM KẾT & HỖ TRỢ KHÁCH HÀNG', style: TextStyle(fontSize: 12, color: Color(0xFF92400E), fontWeight: FontWeight.w600)),
                      ),
                      const SizedBox(height: 12),
                      Text('Giải quyết khiếu nại', style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: _accent)),
                      const SizedBox(height: 8),
                      const Text(
                        'Tại E-Tech Market Official, sự hài lòng của bạn là ưu tiên hàng đầu. Chúng tôi cam kết lắng nghe và giải quyết mọi vướng mắc một cách công bằng, nhanh chóng và minh bạch nhất.',
                        style: TextStyle(fontSize: 14, color: Color(0xFF6B7280)),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF3E8FF),
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: Row(children: const [Icon(Icons.update, size: 14), SizedBox(width: 6), Text('Cập nhật lần cuối: 24/05/2024', style: TextStyle(fontSize: 12))]),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      // Hero image
                      ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.network(
                          'https://lh3.googleusercontent.com/aida-public/AB6AXuB-rTYHvZbrIal1c9ZKagseMS-RxDkYEld0VxMBvyWRszbnXezI0Sh5x6TDISDD2aoy4FX7J17LVowEQkGr081oRvV81iUEaKHcbyfciVHRpRjGOZ2N_Agv59mbNQet1UJvZbo9YwsW5nOTiiH1e2AyCym70sQVZBv3KTBABEWZQyU6dqsrEVEtsEwBFA_WjITRVgAFngUqSchNmmdRkfmscbpNdFJ8wJIvP8qtrU4II5PagoIWbPk_6YxcEUAyqyVygL02VEm8vjg',
                          fit: BoxFit.cover,
                          height: 180,
                          width: double.infinity,
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 16),

                // Main layout: content + aside
                LayoutBuilder(builder: (context, constraints) {
                  final isWide = constraints.maxWidth > 700;
                  return isWide
                      ? Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          // main
                          Expanded(flex: 2, child: _buildMainColumn()),
                          const SizedBox(width: 16),
                          SizedBox(width: 320, child: _buildAsideCard(context)),
                        ])
                      : Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          _buildMainColumn(),
                          const SizedBox(height: 12),
                          _buildAsideCard(context),
                        ]);
                }),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMainColumn() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 8),
        // Commitment card
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(border: const Border(top: BorderSide(color: Color(0xB5F37706), width: 1)),),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(color: const Color(0xFFF7F7FA), borderRadius: BorderRadius.circular(8)),
              child: const Text('CAM KẾT TIẾP NHẬN', style: TextStyle(fontSize: 12, color: Color(0xFF6B7280), fontWeight: FontWeight.w700)),
            ),
            const SizedBox(height: 10),
            Text('Thấu hiểu và Đồng hành', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: _accent)),
            const SizedBox(height: 8),
            const Text('E-Tech Market Official luôn coi trọng mọi ý kiến đóng góp và khiếu nại từ khách hàng. Chúng tôi hiểu rằng trong quá trình vận hành các thiết bị bị công nghệ phức tạp, đôi khi sẽ có những trải nghiệm không mong muốn xảy ra.'),
            const SizedBox(height: 12),
            // commitment bullets
            Column(children: const [
              _CommitmentRow(title: 'Công bằng', desc: 'Xem xét mọi vấn đề dựa trên thực tế và quyền lợi chính đáng của khách hàng.'),
              SizedBox(height: 8),
              _CommitmentRow(title: 'Minh bạch', desc: 'Thông báo rõ ràng các bước xử lý và kết quả xác minh.'),
              SizedBox(height: 8),
              _CommitmentRow(title: 'Trách nhiệm', desc: 'Luôn đứng ra giải quyết đến khi đạt được sự thống nhất tối ưu.'),
            ])
          ]),
        ),

        const SizedBox(height: 12),

        // Process timeline
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(border: const Border(top: BorderSide(color: Color(0xB5F37706), width: 1)),),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('QUY TRÌNH GIẢI QUYẾT', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF6B7280))),
            const SizedBox(height: 8),
            Text('Quy trình giải quyết khiếu nại', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: _accent)),
            const SizedBox(height: 12),
            Column(children: const [
              _ProcessStepCard(stepNumber: 1, title: 'Tiếp nhận yêu cầu', subtitle: 'Qua Hotline, Email hoặc Trực tuyến.'),
              SizedBox(height: 10),
              _ProcessStepCard(stepNumber: 2, title: 'Xác minh thông tin', subtitle: 'Phân tích dữ liệu trong 24-48 giờ.'),
              SizedBox(height: 10),
              _ProcessStepCard(stepNumber: 3, title: 'Đề xuất phương án', subtitle: 'Đưa ra giải pháp hỗ trợ tốt nhất.'),
              SizedBox(height: 10),
              _ProcessStepCard(stepNumber: 4, title: 'Hoàn tất & Chăm sóc', subtitle: 'Thực hiện cam kết và hậu mãi.'),
            ])
          ]),
        ),

        const SizedBox(height: 12),

        // Time handling card
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(border: const Border(top: BorderSide(color: Color(0xB5F37706), width: 1)),),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('THỜI GIAN XỬ LÝ', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF6B7280))),
            const SizedBox(height: 8),
            Text('Thời gian xử lý', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: _accent)),
            const SizedBox(height: 8),
            const Text('Mọi khiếu nại thường sẽ được xử lý dứt điểm trong vòng 3 đến 7 ngày làm việc. Đối với các trường hợp phức tạp liên quan đến nhà sản xuất quốc tế hoặc lỗi kỹ thuật sâu, chúng tôi sẽ thông báo cụ thể lộ trình xử lý cho quý khách.'),
          ]),
        ),
      ],
    );
  }

  Widget _buildAsideCard(BuildContext context) {
    return Column(children: [
      Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(border: const Border(top: BorderSide(color: Color(0xB5F37706), width: 1)),),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('KÊNH TIẾP NHẬN CHÍNH THỨC', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF6B7280))),
          const SizedBox(height: 12),
          _ContactRow(icon: Icons.phone_in_talk, label: 'HOTLINE 24/7', value: _storeContact?['contact_phone']?.toString().trim().isNotEmpty == true ? _storeContact!['contact_phone'] : '1900 8888'),
          const SizedBox(height: 8),
          _ContactRow(icon: Icons.mail, label: 'EMAIL HỖ TRỢ', value: _storeContact?['contact_email']?.toString().trim().isNotEmpty == true ? _storeContact!['contact_email'] : 'support@etechmarket.vn'),
          const SizedBox(height: 8),
          const _ContactRow(icon: Icons.forum, label: 'TRÒ CHUYỆN TRỰC TIẾP', value: 'Live Chat trên Website'),
        ]),
      ),

      const SizedBox(height: 12),

      Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(border: const Border(top: BorderSide(color: Color(0xB5F37706), width: 1)),),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Cần hỗ trợ ngay?', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: _accent)),
          const SizedBox(height: 8),
          const Text('Hãy gửi yêu cầu chi tiết để chúng tôi có thể giúp đỡ bạn nhanh nhất.'),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF7C2E00), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)), padding: const EdgeInsets.symmetric(vertical: 14)),
              onPressed: () {},
              child: const Text('Gửi yêu cầu hỗ trợ ngay →', style: TextStyle(color: Colors.white)),
            ),
          ),
          const SizedBox(height: 8),
          const Text('Phản hồi trung bình: 15 phút', style: TextStyle(fontSize: 12, color: Color(0xFF6B7280))),
        ]),
      ),
    ]);
  }
}

class _CommitmentRow extends StatelessWidget {
  final String title;
  final String desc;
  const _CommitmentRow({required this.title, required this.desc});
  @override
  Widget build(BuildContext context) {
    return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(color: const Color(0xFFFFF7ED), borderRadius: BorderRadius.circular(8)),
        child: const Icon(Icons.verified, size: 18, color: Color(0xFF92400E)),
      ),
      const SizedBox(width: 12),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(title, style: const TextStyle(fontWeight: FontWeight.w700)), const SizedBox(height: 4), Text(desc, style: const TextStyle(color: Color(0xFF6B7280)))])),
    ]);
  }
}

class _ProcessStepCard extends StatelessWidget {
  final int stepNumber;
  final String title;
  final String subtitle;
  const _ProcessStepCard({required this.stepNumber, required this.title, required this.subtitle});
  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFF3E6DE)), color: const Color(0xFFFDF7F3)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.center, children: [
        CircleAvatar(radius: 18, backgroundColor: const Color(0xFFFEEBC8), child: Text('$stepNumber', style: const TextStyle(color: Color(0xFF7C2E00), fontWeight: FontWeight.w700))),
        const SizedBox(height: 8),
        Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
        const SizedBox(height: 6),
        Text(subtitle, textAlign: TextAlign.center, style: const TextStyle(color: Color(0xFF6B7280))),
      ]),
    );
  }
}

class _ContactRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _ContactRow({required this.icon, required this.label, required this.value});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: const Color(0xFFF7FAFC), borderRadius: BorderRadius.circular(8)),
      child: Row(children: [
        Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: const Color(0xFFFFF7ED), borderRadius: BorderRadius.circular(8)), child: Icon(icon, size: 20, color: const Color(0xFF92400E))),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(label, style: const TextStyle(color: Color(0xFF6B7280), fontSize: 12, fontWeight: FontWeight.w700)), Text(value, style: const TextStyle(fontWeight: FontWeight.w700))])),
      ]),
    );
  }
}
