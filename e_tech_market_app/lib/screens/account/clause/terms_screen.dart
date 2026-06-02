import 'package:flutter/material.dart';
import 'privacy_policy_screen.dart';
import 'terms_of_service_screen.dart';
import 'payment_security_policy_screen.dart';
import 'complaint_policy_screen.dart';
import 'one_for_one_policy_screen.dart';
import 'refund_policy_screen.dart';

class TermsScreen extends StatelessWidget {
  const TermsScreen({super.key});

  static const Color _accent = Color(0xFFF97316);
  static const Color _primary = Color(0xFF7C2E00);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Các điều khoản'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
      ),
      body: Container(
        color: const Color(0xFFFAF1EB),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Hero section
                Container(
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      Container(
                        width: 60,
                        height: 60,
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFF7ED),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: const Icon(Icons.gavel, size: 32, color: Color(0xFF92400E)),
                      ),
                      const SizedBox(height: 14),
                      const Text(
                        'Trung tâm Pháp lý',
                        style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Minh bạch và toàn là ưu tiên hàng đầu của E-TECH MARKET!',
                        style: TextStyle(fontSize: 14, color: Color(0xFF92400E), height: 1.5),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Section 1: Chính sách & Điều khoản
                const _SectionHeader(title: 'CHÍNH SÁCH & ĐIỀU KHOẢN'),
                const SizedBox(height: 12),
                _PolicyTile(
                  icon: Icons.shield,
                  title: 'Chính sách bảo mật',
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const PrivacyPolicyScreen())),
                ),
                const SizedBox(height: 10),
                _PolicyTile(
                  icon: Icons.description,
                  title: 'Điều khoản dịch vụ',
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const TermsOfServiceScreen())),
                ),
                const SizedBox(height: 10),
                _PolicyTile(
                  icon: Icons.lock,
                  title: 'Chính sách bảo mật thanh toán',
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const PaymentSecurityPolicyScreen())),
                ),
                const SizedBox(height: 24),

                // Section 2: Hỗ trợ & Giải quyết
                const _SectionHeader(title: 'HỖ TRỢ & GIẢI QUYẾT'),
                const SizedBox(height: 12),
                _PolicyTile(
                  icon: Icons.assignment,
                  title: 'Giải quyết khiếu nại',
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ComplaintPolicyScreen())),
                ),
                const SizedBox(height: 10),
                _PolicyTile(
                  icon: Icons.swap_horiz,
                  title: 'Quy định bảo hành 1 đổi 1',
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const OneForOnePolicyScreen())),
                ),
                const SizedBox(height: 10),
                _PolicyTile(
                  icon: Icons.money_off,
                  title: 'Chính sách hoàn tiền',
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const RefundPolicyScreen())),
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader({required this.title});

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w700,
        color: Color(0xFF6B7280),
        letterSpacing: 0.5,
      ),
    );
  }
}

class _PolicyTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final VoidCallback onTap;

  const _PolicyTile({
    required this.icon,
    required this.title,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFF3E5D4)),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF7ED),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: const Color(0xFF92400E), size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF1F2937),
                  ),
                ),
              ),
              const Icon(Icons.chevron_right, color: Color(0xFF92400E), size: 22),
            ],
          ),
        ),
      ),
    );
  }
}
