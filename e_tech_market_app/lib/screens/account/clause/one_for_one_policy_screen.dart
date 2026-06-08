import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../../../config/api_config.dart';

const Color _accent = Color(0xFF7C2E00);
const Color _surface = Color(0xFFFFF7ED);

class OneForOnePolicyScreen extends StatefulWidget {
  const OneForOnePolicyScreen({super.key});

  
  

  @override
  State<OneForOnePolicyScreen> createState() => _OneForOnePolicyScreenState();
}

class _OneForOnePolicyScreenState extends State<OneForOnePolicyScreen> {



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
        title: const Text('Chính sách 1 đổi 1'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
      ),
      body: Container(
        color: const Color(0xFFF9F2E9),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildHeroCard(),
                const SizedBox(height: 16),
                _buildConditionCard(),
                const SizedBox(height: 16),
                _buildDurationCard(),
                const SizedBox(height: 16),
                _buildProcessCard(),
                const SizedBox(height: 16),
                _buildExcludedCard(),
                const SizedBox(height: 16),
                _buildSupportCard(context),
                const SizedBox(height: 20),
                _buildMoreInfoCard(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeroCard() {
    return Container(
      width: double.infinity,

      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            
            child: const Text(
              'DỊCH VỤ KHÁCH HÀNG',
              style: TextStyle(fontSize: 12, color: Color(0xFF92400E), fontWeight: FontWeight.w700),
            ),
          ),
          const SizedBox(height: 14),
          Text(
            'Chính sách 1 đổi 1',
            style: TextStyle(fontSize: 26, fontWeight: FontWeight.w900, color: _accent),
          ),
          const SizedBox(height: 12),
          const Text(
            'Tại E-Tech Market Official, sự hài lòng của bạn là ưu tiên hàng đầu. Chúng tôi cam kết mang lại trải nghiệm mua sắm an tâm tuyệt đối với chính sách đổi mới sản phẩm linh hoạt, đảm bảo quyền lợi tối đa cho khách hàng.',
            style: TextStyle(fontSize: 14, color: Color(0xFF57534E), height: 1.7),
          ),
          const SizedBox(height: 16),
          ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: Image.network(
              'https://images.pexels.com/photos/5081927/pexels-photo-5081927.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
              height: 190,
              width: double.infinity,
              fit: BoxFit.cover,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildConditionCard() {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(border: const Border(top: BorderSide(color: Color(0xB5F37706), width: 1)),),
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Điều kiện áp dụng', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Color(0xFF1E293B))),
          const SizedBox(height: 14),
          _ConditionTile(
            icon: Icons.settings,
            title: 'Lỗi từ nhà sản xuất',
            description: 'Áp dụng cho các lỗi kỹ thuật, phần cứng phát sinh không do tác động ngoại lực.',
          ),
          const SizedBox(height: 12),
          _ConditionTile(
            icon: Icons.inventory_2,
            title: 'Nguyên vẹn 100%',
            description: 'Sản phẩm không trầy xước, móp méo, còn nguyên tem niêm phong của hãng.',
          ),
          const SizedBox(height: 12),
          _ConditionTile(
            icon: Icons.layers,
            title: 'Đầy đủ phụ kiện',
            description: 'Phải có đầy đủ hộp (box), cáp sạc, sách hướng dẫn và quà tặng kèm (nếu có).',
          ),
        ],
      ),
    );
  }

  Widget _buildDurationCard() {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(border: const Border(top: BorderSide(color: Color(0xB5F37706), width: 1)),),
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Thời hạn áp dụng', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.black87)),
          const SizedBox(height: 8),
          const Text('An tâm trải nghiệm sản phẩm trong thời gian dài', style: TextStyle(color: Colors.black54, height: 1.5)),
          const SizedBox(height: 18),
          Container(
            width: double.infinity,
            decoration: BoxDecoration(color: const Color(0x33FFFFFF), borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0x80FFFFFF))),
            padding: const EdgeInsets.symmetric(vertical: 20),
            child: Column(
              children: const [
                Text('30 Ngày', style: TextStyle(fontSize: 32, fontWeight: FontWeight.w900, color: Colors.black87)),
                SizedBox(height: 8),
                Text('Kể từ ngày mua hàng', style: TextStyle(color: Colors.black54)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProcessCard() {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(border: const Border(top: BorderSide(color: Color(0xB5F37706), width: 1)),),
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Quy trình đổi trả', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Color(0xFF1E293B))),
          const SizedBox(height: 16),
          const _ProcessStepItem(step: 1, title: 'Tiếp nhận', subtitle: 'Liên hệ hotline hoặc ghé cửa hàng trực tiếp.'),
          const SizedBox(height: 12),
          const _ProcessStepItem(step: 2, title: 'Kiểm tra', subtitle: 'Kỹ thuật viên giám định tình trạng máy.'),
          const SizedBox(height: 12),
          const _ProcessStepItem(step: 3, title: 'Xác nhận', subtitle: 'Chốt phương án đổi mới cho khách hàng.'),
          const SizedBox(height: 12),
          const _ProcessStepItem(step: 4, title: 'Đổi mới', subtitle: 'Bàn giao máy mới 100% nguyên seal.'),
        ],
      ),
    );
  }

  Widget _buildExcludedCard() {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(border: const Border(top: BorderSide(color: Color(0xB5F37706), width: 1)),),
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Trường hợp từ chối', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Color(0xFF1E293B))),
          const SizedBox(height: 14),
          const _ExcludedTile(title: 'Lỗi do người dùng', description: 'Sản phẩm bị vào nước, rơi vỡ, cháy nổ do sử dụng sai nguồn điện.'),
          const SizedBox(height: 10),
          const _ExcludedTile(title: 'Tự ý sửa chữa', description: 'Sản phẩm đã bị can thiệp phần cứng hoặc mất tem bảo hành.'),
          const SizedBox(height: 10),
          const _ExcludedTile(title: 'Mất phụ kiện/Hộp', description: 'Không còn đầy đủ phụ kiện đi kèm hoặc hộp bị rách nát, mất form.'),
          const SizedBox(height: 10),
          const _ExcludedTile(title: 'Biến dạng vật lý', description: 'Sản phẩm trầy xước nặng, biến dạng so với tình trạng ban đầu.'),
        ],
      ),
    );
  }

  Widget _buildSupportCard(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(border: const Border(top: BorderSide(color: Color(0xB5F37706), width: 1)),),
      padding: const EdgeInsets.all(18),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          width: 48,
          height: 48,
          decoration: const BoxDecoration(shape: BoxShape.circle, color: Color(0xFF7C2E00)),
          child: const Center(child: Icon(Icons.support_agent, color: Colors.white, size: 24)),
        ),
        const SizedBox(height: 14),
        const Text('Cần hỗ trợ?', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
        const SizedBox(height: 8),
        const Text('Chúng tôi luôn sẵn sàng giải đáp mọi thắc mắc của bạn 24/7.', style: TextStyle(color: Color(0xFF57534E), height: 1.6)),
        const SizedBox(height: 18),
        const Text('HOTLINE MIỄN PHÍ', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 0.8, color: Color(0xFF7C2E00))),
        const SizedBox(height: 8),
        Text(_storeContact?['contact_phone']?.toString().trim().isNotEmpty == true ? _storeContact!['contact_phone'] : '1900 8888', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Color(0xFF7C2E00))),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: _accent,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
            onPressed: () {},
            child: const Text('Gửi yêu cầu hỗ trợ', style: TextStyle(fontSize: 16, color: Colors.white)),
          ),
        ),
      ]),
    );
  }

  Widget _buildMoreInfoCard() {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(border: const Border(top: BorderSide(color: Color(0xB5F37706), width: 1)),),
      padding: const EdgeInsets.all(18),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Thông tin khác', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Color(0xFF1E293B))),
        const SizedBox(height: 12),
        _NavTile(label: 'Chính sách hoàn tiền'),
        const SizedBox(height: 10),
        _NavTile(label: 'Chính sách bảo mật'),
        const SizedBox(height: 10),
        _NavTile(label: 'Điều khoản dịch vụ'),
      ]),
    );
  }
}

class _ConditionTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String description;
  const _ConditionTile({required this.icon, required this.title, required this.description});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(color: const Color(0xFFF8F5F1), borderRadius: BorderRadius.circular(14)),
      padding: const EdgeInsets.all(14),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(color: const Color(0xFFFFF2E7), borderRadius: BorderRadius.circular(12)),
          child: Icon(icon, color: const Color(0xFF92400E), size: 20),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 6),
            Text(description, style: const TextStyle(color: Color(0xFF57534E), height: 1.6)),
          ]),
        ),
      ]),
    );
  }
}

class _ProcessStepItem extends StatelessWidget {
  final int step;
  final String title;
  final String subtitle;
  const _ProcessStepItem({required this.step, required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(color: const Color(0xFFFCF5EC), borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xFFEDD2AC))),
      padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 16),
      child: Column(children: [
        CircleAvatar(radius: 18, backgroundColor: const Color(0xFF7C2E00), child: Text('$step', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800))),
        const SizedBox(height: 12),
        Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
        const SizedBox(height: 6),
        Text(subtitle, textAlign: TextAlign.center, style: const TextStyle(color: Color(0xFF57534E), height: 1.5)),
      ]),
    );
  }
}

class _ExcludedTile extends StatelessWidget {
  final String title;
  final String description;
  const _ExcludedTile({required this.title, required this.description});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(color: const Color(0xFFF7F3F1), borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFFF1D7CB))),
      padding: const EdgeInsets.all(14),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Icon(Icons.close, color: Color(0xFFB45309), size: 20),
        const SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 6),
            Text(description, style: const TextStyle(color: Color(0xFF57534E), height: 1.6)),
          ]),
        ),
      ]),
    );
  }
}

class _NavTile extends StatelessWidget {
  final String label;
  const _NavTile({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(color: const Color(0xFFF9F5F1), borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFFE7E2DD))),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        title: Text(label, style: const TextStyle(fontWeight: FontWeight.w700)),
        trailing: const Icon(Icons.chevron_right, color: Color(0xFF7C2E00)),
        onTap: () {},
      ),
    );
  }
}
