import 'package:flutter/material.dart';

class RefundPolicyScreen extends StatelessWidget {
  const RefundPolicyScreen({super.key});

  static const Color _background = Color(0xFFF9F2E9);
  static const Color _card = Colors.white;
  static const Color _accent = Color(0xFF7C2E00);
  static const Color _muted = Color(0xFF57534E);
  static const Color _mutedDark = Color(0xFF1E293B);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Chính sách hoàn tiền'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
      ),
      body: Container(
        color: _background,
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildHeroCard(),
                const SizedBox(height: 16),
                LayoutBuilder(builder: (context, constraints) {
                  final isWide = constraints.maxWidth > 720;
                  return isWide
                      ? Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Expanded(flex: 2, child: _buildMainColumn()),
                          const SizedBox(width: 16),
                          SizedBox(width: 320, child: _buildSidebar()),
                        ])
                      : Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          _buildMainColumn(),
                          const SizedBox(height: 16),
                          _buildSidebar(),
                        ]);
                }),
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
    //   decoration: BoxDecoration(color: _card, borderRadius: BorderRadius.circular(18)),
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(color: const Color(0xFFFDF2E7), borderRadius: BorderRadius.circular(999)),
            child: const Text('CHÍNH SÁCH & HỖ TRỢ KHÁCH HÀNG', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF92400E))),
          ),
          const SizedBox(height: 14),
          Text('Chính sách hoàn tiền', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900, color: _accent)),
          const SizedBox(height: 10),
          const Text(
            'Cập nhật lần cuối: 24 tháng 5, 2024. E-Tech Market Official cam kết hỗ trợ khách hàng một cách minh bạch, nhanh chóng và rõ ràng.',
            style: TextStyle(fontSize: 14, color: Color(0xFF57534E), height: 1.7),
          ),
          const SizedBox(height: 18),
          Row(
            children: const [
              _HeroStatCard(value: '07 ngày', label: 'thời hạn yêu cầu hoàn tiền'),
              SizedBox(width: 10),
              _HeroStatCard(value: '48 giờ', label: 'thời gian kiểm định sản phẩm'),
              SizedBox(width: 10),
              _HeroStatCard(value: '24/7', label: 'hỗ trợ khách hàng liên tục'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMainColumn() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildConditionCard(),
        const SizedBox(height: 16),
        _buildExcludedCard(),
        const SizedBox(height: 16),
        _buildProcessCard(),
        const SizedBox(height: 16),
        _buildPaymentTableCard(),
      ],
    );
  }

  Widget _buildConditionCard() {
    final eligibleItems = [
      'Thời hạn yêu cầu trong vòng 07 ngày kể từ ngày nhận hàng.',
      'Sản phẩm còn nguyên vẹn, đầy đủ tem mác, hộp và phụ kiện.',
      'Lỗi kỹ thuật từ nhà sản xuất hoặc hư hại trong quá trình vận chuyển.',
      'Có hóa đơn mua hàng hoặc email xác nhận đơn hàng hợp lệ.',
    ];

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(border: const Border(top: BorderSide(color: Color(0xB5F37706), width: 1)),),
      padding: const EdgeInsets.all(18),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const _CardIcon(icon: Icons.check_circle, backgroundColor: Color(0xFFFEF3C7), iconColor: Color(0xFF92400E)),
          const SizedBox(width: 12),
          Expanded(child: Text('1. Điều kiện hoàn tiền', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: RefundPolicyScreen._mutedDark))),
        ]),
        const SizedBox(height: 12),
        const Text('Chúng tôi cam kết mang lại sự hài lòng tuyệt đối. Bạn có thể yêu cầu hoàn tiền nếu đáp ứng các tiêu chí sau:', style: TextStyle(color: Color(0xFF57534E), height: 1.6)),
        const SizedBox(height: 14),
        Column(children: eligibleItems.map((text) => _BulletRow(text)).toList()),
      ]),
    );
  }

  Widget _buildExcludedCard() {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(border: const Border(top: BorderSide(color: Color(0xB5F37706), width: 1)),),
      padding: const EdgeInsets.all(18),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: const [
          _CardIcon(icon: Icons.close, backgroundColor: Color(0xFFFEE2E2), iconColor: Color(0xFFB45309)),
          SizedBox(width: 12),
          Expanded(child: Text('2. Sản phẩm không áp dụng', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: RefundPolicyScreen._mutedDark))),
        ]),
        const SizedBox(height: 12),
        const Text('Một số mặt hàng đặc thù sẽ không được áp dụng chính sách hoàn tiền trừ khi có lỗi kỹ thuật nghiêm trọng:', style: TextStyle(color: Color(0xFF57534E), height: 1.6)),
        const SizedBox(height: 16),
        const _ExcludedItemCard(icon: Icons.apps, title: 'Phần mềm & Key', description: 'Các loại mã kích hoạt đã được gửi hoặc sử dụng.'),
        const SizedBox(height: 12),
        const _ExcludedItemCard(icon: Icons.earbuds, title: 'Thiết bị vệ sinh cá nhân', description: 'Tai nghe in-ear đã bóc seal để đảm bảo vệ sinh.'),
        const SizedBox(height: 12),
        const _MinorNote(text: 'Sản phẩm khuyến mãi (Clearance Sale) có ghi chú không đổi trả.'),
        const SizedBox(height: 8),
        const _MinorNote(text: 'Hư hỏng do người dùng sử dụng sai cách hoặc tự ý can thiệp phần cứng.'),
      ]),
    );
  }

  Widget _buildProcessCard() {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(border: const Border(top: BorderSide(color: Color(0xB5F37706), width: 1)),),
      padding: const EdgeInsets.all(18),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: const [
          _CardIcon(icon: Icons.add, backgroundColor: Color(0xFFFEEBC8), iconColor: Color(0xFF92400E)),
          SizedBox(width: 12),
          Expanded(child: Text('3. Quy trình hoàn tiền', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: RefundPolicyScreen._mutedDark))),
        ]),
        const SizedBox(height: 16),
        const _ProcessStep(step: 1, title: 'Gửi yêu cầu', subtitle: 'Liên hệ bộ phận CSKH qua email hoặc Hotline để thông báo tình trạng sản phẩm.'),
        const SizedBox(height: 12),
        const _ProcessStep(step: 2, title: 'Gửi hàng về trung tâm', subtitle: 'Đóng gói cẩn thận và gửi sản phẩm về địa chỉ kiểm định của E-Tech Market Official.'),
        const SizedBox(height: 12),
        const _ProcessStep(step: 3, title: 'Kiểm định sản phẩm', subtitle: 'Kỹ thuật viên sẽ kiểm tra lỗi trong vòng 48 giờ làm việc kể từ khi nhận hàng.'),
        const SizedBox(height: 12),
        const _ProcessStep(step: 4, title: 'Xác nhận & Hoàn tiền', subtitle: 'Sau khi duyệt, chúng tôi sẽ tiến hành hoàn tiền theo phương thức bạn chọn.'),
      ]),
    );
  }

  Widget _buildPaymentTableCard() {
    final rows = const [
      ['Thẻ tín dụng/Ghi nợ', '7 - 14 ngày làm việc (Tùy ngân hàng)'],
      ['Ví điện tử (Momo, ZaloPay)', '24 - 48 giờ làm việc'],
      ['Chuyển khoản ngân hàng', '3 - 5 ngày làm việc'],
    ];

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(border: const Border(top: BorderSide(color: Color(0xB5F37706), width: 1)),),
      padding: const EdgeInsets.all(18),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: const [
          _CardIcon(icon: Icons.table_chart, backgroundColor: Color(0xFFEFE7FF), iconColor: Color(0xFF5B21B6)),
          SizedBox(width: 12),
          Expanded(child: Text('4. Phương thức và thời gian', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: RefundPolicyScreen._mutedDark))),
        ]),
        const SizedBox(height: 16),
        Table(
          columnWidths: const {0: FlexColumnWidth(1.2), 1: FlexColumnWidth(1.0)},
          border: TableBorder.all(color: const Color(0xFFF3F4F6)),
          children: [
            const TableRow(children: [
              Padding(padding: EdgeInsets.symmetric(vertical: 12, horizontal: 12), child: Text('Phương thức hoàn tiền', style: TextStyle(fontWeight: FontWeight.w700))),
              Padding(padding: EdgeInsets.symmetric(vertical: 12, horizontal: 12), child: Text('Thời gian xử lý', style: TextStyle(fontWeight: FontWeight.w700))),
            ]),
            ...rows.map((row) => TableRow(children: [
                  Container(
                    color: const Color(0xFFF9FAFB),
                    padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 12),
                    child: Text(row[0], style: const TextStyle(color: Color(0xFF1E293B))),
                  ),
                  Padding(padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 12), child: Text(row[1], style: const TextStyle(color: Color(0xFF1E293B)))),
                ])),
          ],
        ),
      ]),
    );
  }

  Widget _buildSidebar() {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Container(
        width: double.infinity,
        decoration: BoxDecoration(border: const Border(top: BorderSide(color: Color(0xB5F37706), width: 1)),),
        padding: const EdgeInsets.all(18),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('CẦN HỖ TRỢ NGAY?', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF1E293B))),
          const SizedBox(height: 12),
          const Text('Đội ngũ kỹ thuật sẵn sàng hỗ trợ', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          const Text('Đội ngũ của chúng tôi luôn sẵn sàng giải đáp mọi thắc mắc về quy trình hoàn tiền, đổi trả và các vấn đề liên quan.', style: TextStyle(color: Color(0xFF57534E), height: 1.6)),
          const SizedBox(height: 16),
          const _ContactRow(icon: Icons.phone_in_talk, label: '1234567890'),
          const SizedBox(height: 10),
          const _ContactRow(icon: Icons.mail, label: 'e_techmarketsupport@gmail.com'),
          const SizedBox(height: 10),
          const _ContactRow(icon: Icons.chat_bubble_outline, label: 'Chat trực tuyến 24/7'),
          const SizedBox(height: 18),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: _accent,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(26)),
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              onPressed: () {},
              child: const Text('Gửi Ticket Hỗ Trợ', style: TextStyle(fontSize: 16, color: Colors.white)),
            ),
          ),
        ]),
      ),
      const SizedBox(height: 16),
      Container(
        width: double.infinity,
        decoration: BoxDecoration(border: const Border(top: BorderSide(color: Color(0xB5F37706), width: 1)),),
        padding: const EdgeInsets.all(18),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Chính sách liên quan', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Color(0xFF1E293B))),
          const SizedBox(height: 12),
          const _LinkRow(label: 'Điều khoản dịch vụ'),
          const SizedBox(height: 10),
          const _LinkRow(label: 'Bảo mật thanh toán'),
          const SizedBox(height: 10),
          const _LinkRow(label: 'Chính sách bảo hành'),
        ]),
      ),
      const SizedBox(height: 16),
      ClipRRect(
        borderRadius: BorderRadius.circular(18),
        child: Image.network(
          'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
          width: double.infinity,
          height: 190,
          fit: BoxFit.cover,
        ),
      ),
      const SizedBox(height: 12),
      Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(border: const Border(top: BorderSide(color: Color(0xB5F37706), width: 1)),),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: const [
          Text('Customer Service Center', style: TextStyle(color: Colors.black, fontSize: 16, fontWeight: FontWeight.w700)),
          SizedBox(height: 8),
          Text('Chăm sóc khách hàng chuyên nghiệp, tận tâm và đáng tin cậy.', style: TextStyle(color: Colors.black54)),
        ]),
      ),
    ]);
  }
}

class _HeroStatCard extends StatelessWidget {
  final String value;
  final String label;
  const _HeroStatCard({required this.value, required this.label});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        decoration: BoxDecoration(color: const Color(0xFFFFF7ED), borderRadius: BorderRadius.circular(16)),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Color(0xFF7C2E00))),
          const SizedBox(height: 8),
          Text(label, style: const TextStyle(fontSize: 12, color: Color(0xFF57534E), height: 1.5)),
        ]),
      ),
    );
  }
}

class _CardIcon extends StatelessWidget {
  final IconData icon;
  final Color backgroundColor;
  final Color iconColor;
  const _CardIcon({required this.icon, required this.backgroundColor, required this.iconColor});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 36,
      height: 36,
      decoration: BoxDecoration(color: backgroundColor, borderRadius: BorderRadius.circular(12)),
      child: Icon(icon, color: iconColor, size: 18),
    );
  }
}

class _BulletRow extends StatelessWidget {
  final String text;
  const _BulletRow(this.text);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Padding(padding: EdgeInsets.only(top: 4), child: Icon(Icons.circle, size: 6, color: Color(0xFF7C2E00))),
        const SizedBox(width: 10),
        Expanded(child: Text(text, style: const TextStyle(color: Color(0xFF57534E), height: 1.6))),
      ]),
    );
  }
}

class _ExcludedItemCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String description;
  const _ExcludedItemCard({required this.icon, required this.title, required this.description});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(color: const Color(0xFFF7FAFC), borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFFE2E8F0))),
      padding: const EdgeInsets.all(14),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(14)),
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

class _MinorNote extends StatelessWidget {
  final String text;
  const _MinorNote({required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Icon(Icons.circle, size: 8, color: Color(0xFF7C2E00)),
      const SizedBox(width: 10),
      Expanded(child: Text(text, style: const TextStyle(color: Color(0xFF57534E), height: 1.6))),
    ]);
  }
}

class _ProcessStep extends StatelessWidget {
  final int step;
  final String title;
  final String subtitle;
  const _ProcessStep({required this.step, required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(color: const Color(0xFFF8F2E9), borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xFFF3E5D4))),
      padding: const EdgeInsets.all(14),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          width: 34,
          height: 34,
          decoration: BoxDecoration(color: const Color(0xFF7C2E00), borderRadius: BorderRadius.circular(999)),
          child: Center(child: Text('$step', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700))),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            const SizedBox(height: 6),
            Text(subtitle, style: const TextStyle(color: Color(0xFF57534E), height: 1.6)),
          ]),
        ),
      ]),
    );
  }
}

class _ContactRow extends StatelessWidget {
  final IconData icon;
  final String label;
  const _ContactRow({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(color: const Color(0xFFFFF2E7), borderRadius: BorderRadius.circular(12)),
        child: Icon(icon, color: const Color(0xFF92400E), size: 18),
      ),
      const SizedBox(width: 12),
      Expanded(child: Text(label, style: const TextStyle(color: Color(0xFF1E293B)))),
    ]);
  }
}

class _LinkRow extends StatelessWidget {
  final String label;
  const _LinkRow({required this.label});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () {},
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 14),
        decoration: BoxDecoration(color: const Color(0xFFF7F9FC), borderRadius: BorderRadius.circular(14)),
        child: Row(children: [
          Expanded(child: Text(label, style: const TextStyle(fontWeight: FontWeight.w700))),
          const Icon(Icons.chevron_right, color: Color(0xFF7C2E00)),
        ]),
      ),
    );
  }
}
