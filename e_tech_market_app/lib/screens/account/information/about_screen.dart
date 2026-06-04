import 'package:flutter/material.dart';
import 'contact_screen.dart';

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Giới thiệu', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 1,
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // ── Hero Banner ──────────────────────────────────────────────────
            Stack(
              children: [
                Image.network(
                  'https://images.unsplash.com/photo-1527430253228-e93688616381?auto=format&fit=crop&w=1800&q=80',
                  height: 230,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    height: 230,
                    color: const Color(0xFF1E293B),
                  ),
                ),
                // Dark tint overlay
                Container(
                  height: 230,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [Colors.black.withOpacity(0.45), Colors.black.withOpacity(0.75)],
                    ),
                  ),
                ),
                // Tag + Text
                Positioned.fill(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF26522),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: const Text('PREMIUM HIGH-TECH GEAR', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1)),
                        ),
                        const SizedBox(height: 12),
                        const Text('Tầm Nhìn & Sứ Mệnh',
                            style: TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w900, height: 1.2)),
                        const SizedBox(height: 10),
                        const Text(
                          'E-Tech Market hướng tới việc trở thành thương hiệu dẫn đầu trong ngành công nghệ, mang đến giải pháp mua sắm tiện lợi, tin cậy và tối ưu chi phí cho người tiêu dùng Việt Nam.',
                          style: TextStyle(color: Colors.white70, fontSize: 13, height: 1.5),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),

            // ── CTA Buttons ──────────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () => Navigator.pop(context),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFF26522),
                        foregroundColor: Colors.white,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      child: const Text('Khám phá sản phẩm', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ContactScreen())),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFFF26522),
                        side: const BorderSide(color: Color(0xFFF26522)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      child: const Text('Liên hệ chúng tôi', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            ),

            // ── Brand Story ──────────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Câu Chuyện Thương Hiệu', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: Color(0xFF0F172A))),
                    const SizedBox(height: 16),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.network(
                        'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80',
                        height: 160,
                        width: double.infinity,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Container(height: 160, color: const Color(0xFFF1F5F9)),
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'E-Tech Market được sinh ra từ niềm đam mê công nghệ và khát khao mang trải nghiệm mua sắm minh bạch, chính xác đến với khách hàng. Chúng tôi tuyển chọn sản phẩm theo tiêu chí hiệu năng – độ bền – giá trị sử dụng thực tế.',
                      style: TextStyle(color: Color(0xFF475569), fontSize: 14, height: 1.6),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Chúng tôi tin rằng công nghệ không chỉ là thiết bị, mà là cách cuộc sống trở nên thuận tiện hơn. Mỗi sản phẩm trên kệ E-Tech Market đều được chọn để giải quyết một nhu cầu rõ ràng, tối ưu cho từng nhóm người dùng.',
                      style: TextStyle(color: Color(0xFF475569), fontSize: 14, height: 1.6),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 20),

            // ── Core Values ──────────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Giá Trị Cốt Lõi', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: Color(0xFF0F172A))),
                  const SizedBox(height: 4),
                  const Text('Những nguyên tắc định hình bản sắc và cách chúng tôi phục vụ khách hàng.',
                      style: TextStyle(color: Color(0xFF64748B), fontSize: 13)),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(child: _buildValueCard(Icons.star_outline, const Color(0xFFF59E0B), 'Chất Lượng', 'Sản phẩm bền bỉ, hiệu năng ổn định, nguồn gốc rõ ràng.')),
                      const SizedBox(width: 12),
                      Expanded(child: _buildValueCard(Icons.verified_user_outlined, const Color(0xFF16A34A), 'Uy Tín', 'Minh bạch giá, chính sách và chăm sóc sau bán hàng.')),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(child: _buildValueCard(Icons.memory_outlined, const Color(0xFF2563EB), 'Công Nghệ', 'Cập nhật xu hướng, tối ưu trải nghiệm số liên tục.')),
                      const SizedBox(width: 12),
                      Expanded(child: _buildValueCard(Icons.people_outline, const Color(0xFF7C3AED), 'Khách Hàng', 'Đặt sự hài lòng của bạn làm trọng tâm mọi quyết định.')),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // ── Stats Banner ─────────────────────────────────────────────────
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16),
              padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 16),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF1E293B), Color(0xFF334155)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _buildStatItem('500k+', 'Khách hàng\ntin dùng'),
                  _buildStatDivider(),
                  _buildStatItem('10k+', 'Sản phẩm\nchính hãng'),
                  _buildStatDivider(),
                  _buildStatItem('50+', 'Đối tác\nchiến lược'),
                  _buildStatDivider(),
                  _buildStatItem('99%', 'Đánh giá\nhài lòng'),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // ── CTA Bottom ───────────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF7F0),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFF26522).withOpacity(0.2)),
                ),
                child: Column(
                  children: [
                    const Text(
                      'Bạn đã sẵn sàng nâng cấp trải nghiệm công nghệ?',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Color(0xFF0F172A)),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Đồng hành cùng E-Tech Market để khám phá những thiết bị công nghệ đỉnh cao của thế hệ mới.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Color(0xFF64748B), fontSize: 13, height: 1.5),
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () => Navigator.pop(context),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFF26522),
                          foregroundColor: Colors.white,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        child: const Text('Mua sắm ngay', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 32),

            // App version footer
            Center(
              child: Column(
                children: [
                  Image.asset('assets/images/logo.png', height: 30, errorBuilder: (_, __, ___) => const SizedBox()),
                  const SizedBox(height: 6),
                  Text('© 2025 E-Tech Market. Bảo lưu mọi quyền.', style: TextStyle(color: Colors.grey.shade500, fontSize: 11)),
                  const SizedBox(height: 4),
                  Text('Phiên bản ứng dụng v1.0.0', style: TextStyle(color: Colors.grey.shade400, fontSize: 11)),
                ],
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildValueCard(IconData icon, Color color, String title, String desc) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(10)),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(height: 12),
          Text(title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: Color(0xFF0F172A))),
          const SizedBox(height: 6),
          Text(desc, style: const TextStyle(color: Color(0xFF64748B), fontSize: 12, height: 1.5)),
        ],
      ),
    );
  }

  Widget _buildStatItem(String number, String label) {
    return Column(
      children: [
        Text(number, style: const TextStyle(color: Color(0xFFF26522), fontWeight: FontWeight.w900, fontSize: 22)),
        const SizedBox(height: 4),
        Text(label, textAlign: TextAlign.center, style: const TextStyle(color: Colors.white60, fontSize: 11, height: 1.4)),
      ],
    );
  }

  Widget _buildStatDivider() {
    return Container(width: 1, height: 40, color: Colors.white12);
  }
}
