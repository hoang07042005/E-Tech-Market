import 'package:flutter/material.dart';

class TermsOfServiceScreen extends StatefulWidget {
  const TermsOfServiceScreen({super.key});

  static const Color _accent = Color(0xFFF97316);
  static const String _bannerImageUrl =
      'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=900&q=80';

  static const List<String> _navItems = [
    '01. Giới thiệu',
    '02. Trách nhiệm tài khoản',
    '03. Sở hữu trí tuệ',
    '04. Giới hạn trách nhiệm',
    '05. Luật áp dụng',
  ];

  @override
  State<TermsOfServiceScreen> createState() => _TermsOfServiceScreenState();
}

class _TermsOfServiceScreenState extends State<TermsOfServiceScreen> {
  final ScrollController _scrollController = ScrollController();
  late final List<GlobalKey> _sectionKeys;
  int _activeNavIndex = 0;

  Color get _accent => TermsOfServiceScreen._accent;
  List<String> get _navItems => TermsOfServiceScreen._navItems;

  @override
  void initState() {
    super.initState();
    _sectionKeys = List.generate(_navItems.length, (_) => GlobalKey());
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToSection(int index) {
    setState(() {
      _activeNavIndex = index;
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final context = _sectionKeys[index].currentContext;
      if (context != null) {
        Scrollable.ensureVisible(
          context,
          duration: const Duration(milliseconds: 420),
          curve: Curves.easeInOut,
          alignment: 0.08,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Điều khoản Dịch vụ',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        backgroundColor: Theme.of(context).colorScheme.surface,
        foregroundColor: Theme.of(context).colorScheme.onSurface,
        elevation: 0,
      ),
      body: Container(
        color: Theme.of(context).colorScheme.surface,
        child: SafeArea(
          child: SingleChildScrollView(
            controller: _scrollController,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(22),
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
                          'ĐIỀU KHOẢN & DỊCH VỤ',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: _accent),
                        ),
                      ),
                      const SizedBox(height: 18),
                      RichText(
                        text: TextSpan(
                          style: TextStyle(
                            fontSize: 32,
                            fontWeight: FontWeight.bold,
                            color: Theme.of(context).colorScheme.onSurface,
                            height: 1.05,
                          ),
                          children: [
                            TextSpan(text: 'Điều khoản ', style: TextStyle(color: Theme.of(context).colorScheme.onSurface)),
                            TextSpan(text: 'Dịch vụ', style: TextStyle(color: _accent)),
                          ],
                        ),
                      ),
                      const SizedBox(height: 14),
                      Text(
                        'E-TECH MARKET cung cấp dịch vụ mua sắm trực tuyến với quy định rõ ràng, minh bạch và bảo vệ quyền lợi khách hàng. Vui lòng đọc kỹ trước khi sử dụng.',
                        style: TextStyle(fontSize: 15, color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.7), height: 1.75),
                      ),
                      const SizedBox(height: 20),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(5),
                        child: Stack(
                          children: [
                            Container(
                              height: 180,
                              width: double.infinity,
                              decoration: BoxDecoration(
                                image: DecorationImage(
                                  image: NetworkImage(TermsOfServiceScreen._bannerImageUrl),
                                  fit: BoxFit.cover,
                                ),
                                color: Theme.of(context).colorScheme.surface,
                              ),
                            ),
                            Container(
                              height: 180,
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  colors: [Colors.black.withOpacity(0.22), Colors.black.withOpacity(0.03)],
                                  begin: Alignment.topCenter,
                                  end: Alignment.bottomCenter,
                                ),
                              ),
                            ),
                            Positioned(
                              left: 16,
                              bottom: 16,
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                                decoration: BoxDecoration(
                                  color: Colors.white.withOpacity(0.9),
                                  borderRadius: BorderRadius.circular(999),
                                ),
                                child: Text(
                                  'PREMIUM HIGH TECH GEAR · E-TECH MARKET',
                                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: _accent),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                Container(
                //   decoration: BoxDecoration(
                //     color: Colors.white,
                //     borderRadius: BorderRadius.circular(20),
                //     border: Border.all(color: const Color(0xFFE5E7EB)),
                //   ),
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
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                              child: Text(
                                entry.value,
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
                                  color: isActive ? _accent : const Color(0xFF475569),
                                ),
                              ),
                            ),
                          ),
                          if (index < _navItems.length - 1)
                            const Divider(height: 1, color: Color(0xFFE5E7EB)),
                        ],
                      );
                    }).toList(),
                  ),
                ),
                const SizedBox(height: 24),
                _buildSection(
                  '01. Giới thiệu',
                  'E-TECH MARKET vận hành cửa hàng trực tuyến và các kênh dịch vụ liên quan nhằm cung cấp sản phẩm công nghệ và trải nghiệm mua sắm rõ ràng, minh bạch cho người dùng. Khi sử dụng nền tảng, bạn đồng ý với các điều khoản dịch vụ này.',
                  sectionKey: _sectionKeys[0],
                  children: const [],
                ),
                const SizedBox(height: 20),
                _buildSection(
                  '02. Trách nhiệm tài khoản',
                  'Tài khoản người dùng phải bảo mật mật khẩu và thông tin đăng nhập. Mọi hành vi vi phạm hoặc cung cấp thông tin không chính xác có thể dẫn đến tạm ngưng quyền sử dụng dịch vụ.',
                  sectionKey: _sectionKeys[1],
                  children: [
                    _IconCard(
                      icon: Icons.check_circle,
                      title: 'Tính chính xác của thông tin',
                      description: 'Thông tin đăng ký, địa chỉ giao hàng và liên hệ cần trung thực. Sai lệch có thể ảnh hưởng đến xử lý đơn hàng và bảo hành.',
                    ),
                    _IconCard(
                      icon: Icons.lock,
                      title: 'Tiêu chuẩn bảo mật',
                      description: 'Bạn chịu trách nhiệm bảo mật phiên đăng nhập, mật khẩu và thông tin xác thực, không chia sẻ cho bên thứ ba.',
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                _buildSection(
                  '03. Sở hữu trí tuệ',
                  'Mọi nội dung hiển thị trên nền tảng — bao gồm nhãn hiệu, giao diện, logo và hình ảnh — thuộc quyền sở hữu của E-TECH MARKET hoặc đối tác được cấp phép.',
                  sectionKey: _sectionKeys[2],
                  children: const [
                    _QuotePanel(
                      quote: 'Sự chính xác là nền tảng của bản sắc thương hiệu chúng tôi.',
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                _buildSection(
                  '04. Giới hạn trách nhiệm',
                  'Trong giới hạn pháp luật cho phép, chúng tôi không chịu trách nhiệm với các tổn thất gián tiếp phát sinh từ mất kết nối mạng, gián đoạn thiết bị hoặc dịch vụ bên thứ ba.',
                  sectionKey: _sectionKeys[3],
                  children: const [
                    _RiskCard(title: 'Truy cập hệ thống trái phép'),
                    _RiskCard(title: 'Hành vi nền tảng của bên thứ ba'),
                  ],
                ),
                const SizedBox(height: 20),
                _buildSection(
                  '05. Luật áp dụng',
                  'Các điều khoản này được điều chỉnh theo luật pháp Việt Nam. Mọi tranh chấp sẽ được ưu tiên giải quyết thông qua thương lượng trước khi sử dụng cơ chế tố tụng.',
                  sectionKey: _sectionKeys[4],
                  children: const [],
                ),
                const SizedBox(height: 28),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSection(String heading, String description,
      {required Key sectionKey, required List<Widget> children}) {
    return Container(
      key: sectionKey,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        border: Border(top: BorderSide(color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.5), width: 1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            heading,
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface),
          ),
          const SizedBox(height: 12),
          Text(
            description,
            style: TextStyle(fontSize: 15, color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.7), height: 1.75),
          ),
          if (children.isNotEmpty) ...[
            const SizedBox(height: 18),
            ...children,
          ],
        ],
      ),
    );
  }
}

class _IconCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String description;

  const _IconCard({required this.icon, required this.title, required this.description});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.5),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, size: 22, color: Theme.of(context).colorScheme.primary),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface)),
                const SizedBox(height: 8),
                Text(description, style: TextStyle(fontSize: 14, color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.7), height: 1.7)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _QuotePanel extends StatelessWidget {
  final String quote;

  const _QuotePanel({required this.quote});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),

      child: Text(
        quote,
        style: const TextStyle(fontSize: 15, color: Color(0xFF92400E), height: 1.9, fontStyle: FontStyle.italic),
      ),
    );
  }
}

class _RiskCard extends StatelessWidget {
  final String title;

  const _RiskCard({required this.title});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.error.withValues(alpha: 0.5),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(Icons.close, size: 20, color: Theme.of(context).colorScheme.error),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Text(
              title,
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: Theme.of(context).colorScheme.onSurface),
            ),
          ),
        ],
      ),
    );
  }
}
