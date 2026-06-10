import 'package:flutter/material.dart';

class PrivacyPolicyScreen extends StatefulWidget {
  const PrivacyPolicyScreen({super.key});

  static const Color _accent = Color(0xFFF97316);
  static const List<String> _navItems = [
    '01. Thu thập dữ liệu',
    '02. Sử dụng thông tin',
    '03. Giao thức cookie',
    '04. Tiết lộ bên thứ ba',
    '05. Quyền của người dùng',
  ];

  static const List<Map<String, String>> _sections = [
    {
      'title': 'Thu thập dữ liệu',
      'content': 'Chúng tôi chỉ thu thập thông tin cần thiết để hoàn tất đơn hàng, giao hàng và hỗ trợ khách hàng. Thông tin này bao gồm họ tên, email, số điện thoại, địa chỉ giao hàng và dữ liệu liên quan đến lịch sử mua sắm.',
    },
    {
      'title': 'Sử dụng thông tin',
      'content': 'Dữ liệu được sử dụng để xác nhận và hoàn tất giao dịch, gửi thông báo đơn hàng, hỗ trợ bảo hành, và cải thiện trải nghiệm trên ứng dụng. Mọi xử lý đều tuân thủ nguyên tắc tối thiểu hóa.',
    },
    {
      'title': 'Giao thức cookie',
      'content': 'Cookies và công nghệ tương tự giúp ghi nhớ giỏ hàng, trạng thái đăng nhập và tùy chỉnh trải nghiệm. Người dùng có thể tắt cookie qua cài đặt trình duyệt; chúng tôi không theo dõi danh tính cá nhân qua cookie.',
    },
    {
      'title': 'Tiết lộ bên thứ ba',
      'content': 'Chúng tôi chỉ chia sẻ dữ liệu với đối tác khi cần thiết cho giao dịch, vận chuyển hoặc xử lý thanh toán, và các đối tác này phải tuân thủ chính sách bảo mật tương ứng.',
    },
  ];

  static const List<Map<String, String>> _partnerRows = [
    {
      'partner': 'Đơn vị vận chuyển',
      'purpose': 'Theo dõi đơn giao nhận và thông báo trạng thái cho khách hàng.',
    },
    {
      'partner': 'Cổng thanh toán',
      'purpose': 'Xử lý giao dịch và đối soát; chúng tôi không lưu chi tiết thẻ tín dụng nguyên bản.',
    },
    {
      'partner': 'Hạ tầng & bảo trì',
      'purpose': 'Lưu trữ, vận hành máy chủ, nhật ký bảo mật và sao lưu dữ liệu an toàn.',
    },
  ];

  static const List<Map<String, String>> _userRights = [
    {
      'title': 'Khả năng di chuyển dữ liệu',
      'description': 'Yêu cầu bản dữ liệu cung cấp ở định dạng có cấu trúc và phù hợp nếu quy định cho phép.',
    },
    {
      'title': 'Quyền được xóa bỏ',
      'description': 'Yêu cầu xóa dữ liệu không cần thiết, trừ khi pháp luật yêu cầu lưu giữ.',
    },
    {
      'title': 'Quyền chỉnh sửa & làm rõ',
      'description': 'Cập nhật sai sót trong hồ sơ cá nhân hoặc bổ sung thông tin chưa đầy đủ.',
    },
    {
      'title': 'Quyền khiếu nại',
      'description': 'Phản ánh vấn đề xử lý không phù hợp, chúng tôi sẽ kiểm tra và trả lời theo luồng hỗ trợ.',
    },
  ];

  @override
  State<PrivacyPolicyScreen> createState() => _PrivacyPolicyScreenState();
}

class _PrivacyPolicyScreenState extends State<PrivacyPolicyScreen> {
  final ScrollController _scrollController = ScrollController();
  late List<GlobalKey> _sectionKeys;
  int _activeNavIndex = 0;

  Color get _accent => PrivacyPolicyScreen._accent;
  List<String> get _navItems => PrivacyPolicyScreen._navItems;
  List<Map<String, String>> get _sections => PrivacyPolicyScreen._sections;
  List<Map<String, String>> get _partnerRows => PrivacyPolicyScreen._partnerRows;
  List<Map<String, String>> get _userRights => PrivacyPolicyScreen._userRights;

  @override
  void initState() {
    super.initState();
    _resetSectionKeys();
  }

  @override
  void didUpdateWidget(covariant PrivacyPolicyScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (_sectionKeys.length != _navItems.length) {
      _resetSectionKeys();
    }
  }

  void _resetSectionKeys() {
    _sectionKeys = List.generate(_navItems.length, (_) => GlobalKey());
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToSection(int index) {
    debugPrint('🔹 Scroll to section: $index, nav items: ${_navItems.length}, section keys: ${_sectionKeys.length}');
    setState(() {
      _activeNavIndex = index;
    });
    
    Future.delayed(const Duration(milliseconds: 100), () {
      try {
        final context = _sectionKeys[index].currentContext;
        debugPrint('🔹 Section $index context: ${context != null ? "FOUND" : "NULL"}');
        
        if (context != null) {
          debugPrint('🔹 Widget type: ${context.widget.runtimeType}');
          debugPrint('🔹 Calling ensureVisible for section $index');
          Scrollable.ensureVisible(
            context,
            duration: const Duration(milliseconds: 420),
            curve: Curves.easeInOut,
            alignment: 0.05,
          ).catchError((e) {
            debugPrint('❌ ensureVisible error: $e');
          });
        } else {
          debugPrint('❌ Context is null');
        }
      } catch (e) {
        debugPrint('❌ Scroll error: $e');
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_sectionKeys.length != _navItems.length) {
      _resetSectionKeys();
    }
    return Scaffold(
      appBar: AppBar(
        title: const Text('Chính sách bảo mật', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        backgroundColor: Theme.of(context).colorScheme.surface,
        foregroundColor: Theme.of(context).colorScheme.onSurface,
        elevation: 1,
      ),
      body: Container(
        color: Theme.of(context).colorScheme.surface,
        child: SafeArea(
          child: SingleChildScrollView(
            controller: _scrollController,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: _accent.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        'AN NINH & QUYỀN RIÊNG TƯ',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: _accent),
                      ),
                    ),
                    const SizedBox(height: 18),
                    RichText(
                      text: TextSpan(
                        style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface, height: 1.05),
                        children: [
                          TextSpan(text: 'Chính sách ', style: TextStyle(color: Theme.of(context).colorScheme.onSurface)),
                          TextSpan(text: 'bảo mật', style: TextStyle(color: _accent)),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'E-TECH MARKET cam kết đảm bảo tính toàn vẹn và minh bạch đối với dữ liệu của bạn. Chính sách này mô tả cách chúng tôi thu thập, sử dụng, lưu trữ và bảo vệ thông tin cá nhân khi bạn sử dụng ứng dụng.',
                      style: TextStyle(fontSize: 15, color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.7), height: 1.7),
                    ),
                    const SizedBox(height: 22),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(5),
                      child: Stack(
                        children: [
                          Container(
                            height: 180,
                            width: double.infinity,
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [Color(0xFF1D4ED8), Color(0xFF60A5FA)],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                              image: const DecorationImage(
                                image: NetworkImage('https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=900&q=80'),
                                fit: BoxFit.cover,
                              ),
                            ),
                          ),
                          Container(
                            height: 180,
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [Colors.black.withOpacity(0.18), Colors.black.withOpacity(0.04)],
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                              ),
                            ),
                          ),
                          Positioned(
                            left: 16,
                            right: 16,
                            bottom: 16,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.95),
                                borderRadius: BorderRadius.circular(5),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text(
                                    'Cập nhật lần cuối',
                                    style: TextStyle(fontSize: 12, color: Color(0xFF374151)),
                                  ),
                                  Text(
                                    'tháng 5, 2026',
                                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: _accent),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: _accent,
                  borderRadius: BorderRadius.circular(5),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x22000000),
                      blurRadius: 14,
                      offset: Offset(0, 8),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Cần giải đáp?',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Đội ngũ hỗ trợ của chúng tôi sẵn sàng giải đáp thắc mắc về quyền riêng tư và dữ liệu cá nhân.',
                      style: TextStyle(fontSize: 14, color: Colors.white70, height: 1.6),
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: _accent,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(5)),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                        onPressed: () {},
                        child: const Text('LIÊN HỆ ĐỘI NGŨ'),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
                // decoration: BoxDecoration(
                //   color: Colors.white,
                //   borderRadius: BorderRadius.circular(20),
                //   border: Border.all(color: const Color(0xFFE5E7EB)),
                // ),
                child: Column(
                  children: _navItems.asMap().entries.map((entry) {
                    final index = entry.key;
                    final isActive = index == _activeNavIndex;
                    return Column(
                      children: [
                        InkWell(
                          onTap: () => _scrollToSection(index),
                          child: Container(
                            width: double.infinity,
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
                            child: Text(
                              entry.value,
                              style: TextStyle(
                                fontSize: 14,
                                color: isActive ? _accent : const Color(0xFF475569),
                                fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
                              ),
                            ),
                          ),
                        ),
                        if (index < _navItems.length - 1)
                          const Divider(color: Color(0xFFE5E7EB), height: 1),
                      ],
                    );
                  }).toList(),
                ),
              ),
              const SizedBox(height: 24),
              _buildSection(
                '01. Thu thập dữ liệu',
                '''Chúng tôi chỉ thu thập các loại thông tin cần thiết để cung cấp dịch vụ cửa hàng: xử lý đơn hàng, giao nhận, hỗ trợ khách hàng và cải thiện trải nghiệm.
Dữ liệu không được thu thập với mục đích không rõ hoặc vượt ngoài mục tiêu nêu tại đây.''',
                sectionKey: _sectionKeys[0],
                children: [
                  const _InfoBox(
                    title: 'Dữ liệu trực tiếp',
                    description: 'Họ tên, email, số điện thoại, địa chỉ giao hàng và các thông tin bạn chủ động cung cấp khi đăng ký, đặt hàng hoặc liên hệ hỗ trợ.',
                  ),
                  const _InfoBox(
                    title: 'Dữ liệu kỹ thuật',
                    description: 'Địa chỉ IP, loại thiết bị, trình duyệt, múi giờ và nhật ký giao tiếp cơ bản với server để đảm bảo bảo mật, chống lạm dụng và tối ưu hiệu năng.',
                  ),
                ],
              ),
              const SizedBox(height: 20),
              _buildSection(
                '02. Sử dụng thông tin',
                'Thông tin được xử lý trên nguyên tắc tối thiểu hóa, đúng mục đích và được bảo vệ bằng các biện pháp kỹ thuật, tổ chức hợp lý trong phạm vi cho phép của pháp luật.',
                sectionKey: _sectionKeys[1],
                children: const [
                    _BulletItem(text: 'Xác nhận và hoàn thiện giao dịch mua sắm, vận chuyển, hóa đơn hoặc bảo hành.'),
                    _BulletItem(text: 'Trao đổi tiếp nhận yêu cầu và thông báo liên quan đến tài khoản hoặc đơn đặt hàng của bạn.'),
                    _BulletItem(text: 'Đo lường lỗi, bảo trì và cải thiện tốc độ, thiết kế trải nghiệm trên nền tảng của chúng tôi.'),
                    _BulletItem(text: 'Tuân thủ nghĩa vụ pháp định, trả lời cơ quan có thẩm quyền khi có căn cứ hợp pháp.'),
                  ]),
              const SizedBox(height: 20),
              _buildSection(
                '03. Giao thức cookie',
                'Chúng tôi có thể sử dụng cookie và công nghệ tương tự để ghi nhớ phiên làm việc (ví dụ giỏ hàng, trạng thái đăng nhập) và để đối chiếu lưu vực không nhận biết cá nhân.',
                sectionKey: _sectionKeys[2],
                children: const [
                    _Paragraph(text: 'Trình duyệt của bạn cho phép giới hạn hoặc xóa cookie; một số tính năng của app có thể bị ảnh hưởng nhẹ.'),
                    _Paragraph(text: 'Cookie phân tích (nếu có) chỉ được bật khi phù hợp và có thể tắt qua banner hoặc cài đặt trình duyệt.'),
                    _Paragraph(text: 'Chúng tôi không dùng cookie để định danh cá nhân của bạn.'),
                  ],
                  isImageSection: true),
              const SizedBox(height: 20),
              _buildSection(
                '04. Tiết lộ bên thứ ba',
                'Việc chia sẻ dữ liệu với nhà cung cấp dịch vụ chỉ diễn ra khi cần thiết cho luồng giao dịch hoặc vận hành và theo thỏa thuận bảo vệ ngang bằng với mức tối thiểu ghi nhận tại đây.',
                sectionKey: _sectionKeys[3],
                children: _partnerRows
                      .map((row) => _PartnerRow(partner: row['partner']!, purpose: row['purpose']!))
                      .toList()),
              const SizedBox(height: 20),
              Container(
                key: _sectionKeys[4],
                padding: const EdgeInsets.all(20),
                decoration: const BoxDecoration(
                  border: const Border(top: BorderSide(color: Color(0xB5F37706), width: 1)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('05. Quyền của người dùng', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface)),
                    const SizedBox(height: 12),
                    Text(
                      'Bạn có thể liên hệ chúng tôi để thực hiện các quyền sau trong phạm vi luật hiện hành và tính khả thi kỹ thuật.',
                      style: TextStyle(fontSize: 15, color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.7), height: 1.7),
                    ),
                    const SizedBox(height: 16),
                    ..._userRights.map((item) {
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 14),
                        child: _RightCard(title: item['title']!, description: item['description']!),
                      );
                    }).toList(),
                  ],
                ),
              ),
              const SizedBox(height: 30),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSection(String heading, String description, {required Key sectionKey, required List<Widget> children, bool isImageSection = false}) {
    return Container(
      key: sectionKey,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
       border:  Border(top: BorderSide(color: Theme.of(context).colorScheme.primary, width: 0.5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(heading, style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface)),
          const SizedBox(height: 12),
          Text(description, style: TextStyle(fontSize: 15, color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.7), height: 1.75)),
          const SizedBox(height: 16),
          if (isImageSection) ...[
            ClipRRect(
              borderRadius: BorderRadius.circular(5),
              child: Container(
                height: 160,
                color: Theme.of(context).colorScheme.onSurface,
                alignment: Alignment.center,
                child: const Icon(Icons.cookie, size: 64, color: Color(0xFF94A3B8)),
              ),
            ),
            const SizedBox(height: 16),
          ],
          ...children,
        ],
      ),
    );
  }
}

class _InfoBox extends StatelessWidget {
  const _InfoBox({required this.title, required this.description});

  final String title;
  final String description;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(5),
        border: Border.all(color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Theme.of(context).colorScheme.onSurface)),
          const SizedBox(height: 8),
          Text(description, style: TextStyle(fontSize: 14, color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.7), height: 1.7)),
        ],
      ),
    );
  }
}

class _BulletItem extends StatelessWidget {
  const _BulletItem({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Icon(Icons.circle, size: 8, color: Theme.of(context).colorScheme.primary),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(text, style: TextStyle(fontSize: 14, color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.7), height: 1.7)),
          ),
        ],
      ),
    );
  }
}

class _Paragraph extends StatelessWidget {
  const _Paragraph({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Text(text, style: TextStyle(fontSize: 14, color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.7), height: 1.7)),
    );
  }
}

class _PartnerRow extends StatelessWidget {
  const _PartnerRow({required this.partner, required this.purpose});

  final String partner;
  final String purpose;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(5),
        border: Border.all(color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(partner, style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface)),
          const SizedBox(height: 8),
          Text(purpose, style: TextStyle(fontSize: 14, color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.7), height: 1.7)),
        ],
      ),
    );
  }
}

class _RightCard extends StatelessWidget {
  const _RightCard({required this.title, required this.description});

  final String title;
  final String description;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(5),
        border: Border.all(color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface)),
          const SizedBox(height: 8),
          Text(description, style: TextStyle(fontSize: 14, color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.7), height: 1.7)),
        ],
      ),
    );
  }
}
