import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../services/checkout_service.dart';
import '../../../config/dio_client.dart';

class LoyaltyScreen extends StatefulWidget {
  const LoyaltyScreen({super.key});

  @override
  State<LoyaltyScreen> createState() => _LoyaltyScreenState();
}

class _LoyaltyScreenState extends State<LoyaltyScreen> {
  Map<String, dynamic>? _loyaltyData;
  bool _loading = true;
  bool _isMember = false;
  bool _registering = false;

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() => _loading = true);
    try {
      // Fetch /me to get latest is_loyalty_member status
      final meRes = await DioClient.instance.get('/me');
      final me = meRes.data is Map ? meRes.data : {};
      final user = me['user'] ?? me;
      final isMember = user['is_loyalty_member'] == true;

      Map<String, dynamic>? loyaltyData;
      if (isMember) {
        loyaltyData = await CheckoutService.fetchLoyaltyData();
      }

      if (mounted) {
        setState(() {
          _isMember = isMember;
          _loyaltyData = loyaltyData;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _registerLoyalty() async {
    setState(() => _registering = true);
    try {
      await DioClient.instance.post('/loyalty/register');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Đăng ký thẻ hội viên thành công! 🎉'),
            backgroundColor: Colors.green,
          ),
        );
        await _fetchData();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Lỗi: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _registering = false);
    }
  }

  Future<void> _cancelLoyalty() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Hủy thẻ hội viên'),
        content: const Text(
          'Bạn có chắc muốn hủy thẻ hội viên?\n\nToàn bộ điểm tích lũy và đặc quyền có thể bị ảnh hưởng.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Không'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Hủy thẻ', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    try {
      await DioClient.instance.post('/loyalty/cancel');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Đã hủy thẻ hội viên.'),
            backgroundColor: Colors.orange,
          ),
        );
        await _fetchData();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Lỗi: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  String _fmtMoney(dynamic val) {
    if (val == null) return '0đ';
    final n = val is num ? val.toDouble() : double.tryParse(val.toString()) ?? 0.0;
    return '${n.toStringAsFixed(0).replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (m) => '${m[1]}.')}đ';
  }

  double _parseDouble(dynamic val) {
    if (val == null) return 0.0;
    if (val is num) return val.toDouble();
    return double.tryParse(val.toString()) ?? 0.0;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Thẻ Hội Viên', style: TextStyle(fontWeight: FontWeight.bold)),
        centerTitle: true,
        elevation: 0,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _isMember
              ? _buildMemberView()
              : _buildRegisterView(),
    );
  }

  // ─── NON-MEMBER: Register view ───────────────────────────────────────────

  Widget _buildRegisterView() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const SizedBox(height: 24),
          // Hero icon
          Container(
            width: 96,
            height: 96,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: const LinearGradient(
                colors: [Color(0xFFFFE16D), Color(0xFFE9C400)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFFFFE16D).withOpacity(0.4),
                  blurRadius: 24,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: const Icon(Icons.card_membership, color: Color(0xFF1E293B), size: 48),
          ),
          const SizedBox(height: 28),
          const Text(
            'Trở thành Hội viên E-Tech',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 12),
          Text(
            'Mở khóa hàng ngàn đặc quyền thượng lưu, mua sắm thả ga với mức giá ưu đãi và nhận quà tặng bất ngờ. Đăng ký hoàn toàn miễn phí!',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 14, color: Colors.grey[600], height: 1.5),
          ),
          const SizedBox(height: 32),
          // Features list
          ..._features.map((f) => _buildFeatureTile(f['icon'] as IconData, f['title'] as String, f['desc'] as String)),
          const SizedBox(height: 40),
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton(
              onPressed: _registering ? null : _registerLoyalty,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFE9C400),
                foregroundColor: const Color(0xFF1E293B),
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: _registering
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF1E293B)),
                    )
                  : const Text(
                      'Đăng ký ngay - Miễn phí',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
            ),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  static const _features = [
    {'icon': Icons.star_outline, 'title': 'Tích điểm mỗi đơn hàng', 'desc': 'Nhận điểm thưởng với mỗi giao dịch và đổi lấy ưu đãi hấp dẫn.'},
    {'icon': Icons.workspace_premium_outlined, 'title': 'Ưu đãi hạng thành viên', 'desc': 'Thăng hạng để nhận quyền lợi ngày càng tốt hơn.'},
    {'icon': Icons.local_offer_outlined, 'title': 'Voucher độc quyền', 'desc': 'Nhận mã giảm giá và ưu đãi chỉ dành riêng cho hội viên.'},
  ];

  Widget _buildFeatureTile(IconData icon, String title, String desc) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: const Color(0xFFFEF9C3),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: const Color(0xFFCA8A04), size: 22),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                const SizedBox(height: 4),
                Text(desc, style: TextStyle(fontSize: 13, color: Colors.grey[600])),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ─── MEMBER: Single scroll page ─────────────────────────────────────────

  Widget _buildMemberView() {
    final data = _loyaltyData;
    if (data == null) return const Center(child: Text('Không có dữ liệu.'));

    final nextRank = data['next_rank'];
    final totalSpent = _parseDouble(data['total_spent']);
    final minSpend = nextRank != null ? _parseDouble(nextRank['min_spend']) : 0.0;
    final progress = minSpend > 0 ? (totalSpent / minSpend).clamp(0.0, 1.0) : 1.0;
    final remaining = nextRank != null ? (minSpend - totalSpent).clamp(0.0, double.infinity) : 0.0;
    final rankName = data['membership_rank']?['rank_name']?.toString() ?? '';
    final history = data['point_history'] as List<dynamic>? ?? [];

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // ══════════════════════════════
          // 1. Thẻ hội viên
          // ══════════════════════════════
          _buildMemberCard(data, rankName, nextRank, totalSpent, progress, remaining),
          const SizedBox(height: 28),

          // ══════════════════════════════
          // 2. Lịch sử điểm + và -
          // ══════════════════════════════
          _buildHistorySection(history),
          const SizedBox(height: 28),

          // ══════════════════════════════
          // 3. Nút hủy thẻ hội viên
          // ══════════════════════════════
          OutlinedButton.icon(
            onPressed: _cancelLoyalty,
            icon: const Icon(Icons.cancel_outlined, size: 20, color: Colors.red),
            label: const Text('Hủy thẻ hội viên', style: TextStyle(color: Colors.red, fontWeight: FontWeight.w600)),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: Colors.red),
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  // 1. Thẻ hội viên
  Widget _buildMemberCard(
    Map<String, dynamic> data,
    String rankName,
    dynamic nextRank,
    double totalSpent,
    double progress,
    double remaining,
  ) {
    return Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(color: Colors.black.withOpacity(0.4), blurRadius: 20, offset: const Offset(0, 8)),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: Stack(
                children: [
                  // Ảnh nền
                  Positioned.fill(
                    child: Image.asset(
                      'assets/images/screen1.png',
                      fit: BoxFit.cover,
                    ),
                  ),
                  // Overlay màu tối mờ lên trên ảnh
                  Positioned.fill(
                    child: Container(
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            Color(0xE0111827), // tối đậm bên trái/dưới
                            Color(0x991E293B), // tối mờ hơn bên phải/trên
                          ],
                          begin: Alignment.bottomLeft,
                          end: Alignment.topRight,
                        ),
                      ),
                    ),
                  ),
                  // Nội dung thẻ
                  Padding(
                    padding: const EdgeInsets.fromLTRB(24, 20, 24, 20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                          // ── Row 1: Header ──
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Flexible(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: const [
                                    Text(
                                      'E-TECH ECOSYSTEM',
                                      style: TextStyle(
                                        color: Color(0xFFD0C6AB),
                                        fontSize: 10,
                                        fontWeight: FontWeight.w600,
                                        letterSpacing: 1.5,
                                      ),
                                    ),
                                    SizedBox(height: 4),
                                    Text(
                                      'Thẻ Thành Viên E-Tech',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontSize: 18,
                                        fontWeight: FontWeight.bold,
                                      ),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 8),
                              // Points badge
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF1E293B),
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: const Color(0xFFFFE16D).withOpacity(0.3)),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      '${data['current_points']}',
                                      style: const TextStyle(
                                        color: Color(0xFFFFE16D),
                                        fontSize: 15,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    const SizedBox(width: 5),
                                    const Text(
                                      'Điểm',
                                      style: TextStyle(color: Color(0xFFFFE16D), fontSize: 11),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 24),

                          // ── Row 2: Rank name (lớn, vàng) ──
                          Text(
                            rankName.isNotEmpty ? 'Thành viên ($rankName)' : 'Thành viên',
                            style: const TextStyle(
                              color: Color(0xFFE3B707),
                              fontSize: 24,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.5,
                            ),
                          ),
                          const SizedBox(height: 10),

                          // ── Row 3: Chi tiêu ──
                          Row(
                            children: [
                              const Text(
                                'Chi tiêu tích lũy: ',
                                style: TextStyle(color: Color(0xFFD0C6AB), fontSize: 13),
                              ),
                              Text(
                                _fmtMoney(data['total_spent']),
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 15,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 20),

                          // ── Row 4: Progress bar + Diamond ──
                          Stack(
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // Progress bar
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(3),
                                    child: LinearProgressIndicator(
                                      value: progress,
                                      minHeight: 5,
                                      backgroundColor: const Color(0xFF334155),
                                      valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFFE9C400)),
                                    ),
                                  ),
                                  const SizedBox(height: 10),
                                  // Progress text
                                  if (nextRank != null)
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Flexible(
                                          child: Text(
                                            'Tiến trình thăng hạng ${nextRank['rank_name'] ?? ''}',
                                            style: const TextStyle(color: Color(0xFFD0C6AB), fontSize: 11),
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        Text(
                                          'Cần thêm ${_fmtMoney(remaining)}',
                                          style: const TextStyle(
                                            color: Color(0xFFE9C400),
                                            fontSize: 11,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ],
                                    )
                                  else
                                    Row(
                                      children: [
                                        const Icon(Icons.verified, color: Color(0xFFFFE16D), size: 14),
                                        const SizedBox(width: 6),
                                        Text(
                                          'Bạn đã đạt hạng cao nhất!',
                                          style: TextStyle(
                                            color: const Color(0xFFD0C6AB).withOpacity(0.8),
                                            fontSize: 11,
                                          ),
                                        ),
                                      ],
                                    ),
                                ],
                              ),
                              // Diamond icon góc phải
                              Positioned(
                                right: 0,
                                bottom: 0,
                                child: Opacity(
                                  opacity: 0.5,
                                  child: Icon(
                                    Icons.diamond_outlined,
                                    color: const Color(0xFFFFE16D),
                                    size: 36,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
  }


  // 2. Lịch sử điểm
  Widget _buildHistorySection(List<dynamic> history) {

    if (history.isEmpty) {
      return Container(
        padding: const EdgeInsets.symmetric(vertical: 32),
        child: Column(
          children: [
            Icon(Icons.history, size: 48, color: Colors.grey[300]),
            const SizedBox(height: 12),
            Text('Chưa có lịch sử giao dịch.', style: TextStyle(color: Colors.grey[500], fontSize: 14)),
          ],
        ),
      );
    }
    // Wrap in Column (not ListView) vì bên trong SingleChildScrollView
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            const Icon(Icons.history, size: 18, color: Color(0xFFE9C400)),
            const SizedBox(width: 8),
            const Text('Lịch sử điểm', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          ],
        ),
        const SizedBox(height: 12),
        ...List.generate(history.length, (index) {
          final item = history[index] as Map<String, dynamic>;
          final points = _parseDouble(item['points_changed']).toInt();
          final isPositive = points >= 0;
          final color = isPositive ? const Color(0xFF10B981) : const Color(0xFFEF4444);
          final prefix = isPositive ? '+' : '';

          String dateStr = '';
          if (item['created_at'] != null) {
            try {
              final dt = DateTime.parse(item['created_at'].toString());
              dateStr = DateFormat('HH:mm – dd/MM/yyyy').format(dt.toLocal());
            } catch (_) {}
          }

          return Padding(
            padding: EdgeInsets.only(bottom: index == history.length - 1 ? 0 : 8),
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Theme.of(context).cardColor,
              ),
              child: Row(
                children: [
                  Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: color.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      isPositive ? Icons.add_circle_outline : Icons.remove_circle_outline,
                      color: color,
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item['description']?.toString() ?? (item['action_type'] == 'earn' ? 'Tích lũy điểm' : 'Tiêu điểm'),
                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                        ),
                        if (dateStr.isNotEmpty) ...[
                          const SizedBox(height: 3),
                          Text(dateStr, style: TextStyle(fontSize: 12, color: Colors.grey[500])),
                        ],
                      ],
                    ),
                  ),
                  Text(
                    '$prefix$points điểm',
                    style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                ],
              ),
            ),
          );
        }),
      ],
    );
  }
}
