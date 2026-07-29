import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

class LoyaltyCard extends StatefulWidget {
  final Map<String, dynamic> loyaltyData;
  final VoidCallback onCancelLoyalty;

  const LoyaltyCard({
    super.key,
    required this.loyaltyData,
    required this.onCancelLoyalty,
  });

  @override
  State<LoyaltyCard> createState() => _LoyaltyCardState();
}

class _LoyaltyCardState extends State<LoyaltyCard> {
  bool _showHistory = false;

  String _formatCurrency(dynamic value) {
    if (value == null) return '0';
    final n = value is num ? value.toDouble() : double.tryParse(value.toString()) ?? 0.0;
    return n
        .toStringAsFixed(0)
        .replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (m) => '${m[1]}.');
  }

  double _parseDouble(dynamic value) {
    if (value == null) return 0.0;
    if (value is num) return value.toDouble();
    return double.tryParse(value.toString()) ?? 0.0;
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _buildCard(),
        if (_showHistory) ...[
          const SizedBox(height: 16),
          _buildHistory(),
        ],
        const SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            TextButton.icon(
              onPressed: () => setState(() => _showHistory = !_showHistory),
              icon: Icon(
                _showHistory ? Icons.expand_less : Icons.history,
                color: const Color(0xFFFFE16D),
                size: 20,
              ),
              label: Text(
                _showHistory ? 'Ẩn lịch sử' : 'Xem lịch sử điểm',
                style: const TextStyle(color: Color(0xFFFFE16D)),
              ),
            ),
            TextButton.icon(
              onPressed: () => _confirmCancel(context),
              icon: const Icon(Icons.cancel_outlined, color: Colors.redAccent, size: 20),
              label: const Text('Hủy hội viên', style: TextStyle(color: Colors.redAccent)),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildCard() {
    final nextRank = widget.loyaltyData['next_rank'];
    final totalSpent = _parseDouble(widget.loyaltyData['total_spent']);

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(color: Colors.black26, blurRadius: 10, offset: Offset(0, 5)),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Stack(
          children: [
            // Background image
            Positioned.fill(
              child: Opacity(
                opacity: 0.5,
                child: Image.asset('assets/images/screen1.png', fit: BoxFit.cover),
              ),
            ),
            // Gradient overlay
            Positioned.fill(
              child: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xF00F172A), Color(0x661E293B)],
                    begin: Alignment.bottomLeft,
                    end: Alignment.topRight,
                  ),
                ),
              ),
            ),
            // Card content
            Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text(
                            'E-TECH ECOSYSTEM',
                            style: TextStyle(
                              color: Color(0xFFD0C6AB),
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              letterSpacing: 1.2,
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
                          ),
                        ],
                      ),
                      // Points badge
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: const Color(0xFFFFE16D).withOpacity(0.3),
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              '${widget.loyaltyData['current_points']}',
                              style: const TextStyle(
                                color: Color(0xFFFFE16D),
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(width: 4),
                            const Text(
                              'Điểm',
                              style: TextStyle(color: Color(0xFFFFE16D), fontSize: 10),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  // Rank name
                  Text(
                    (widget.loyaltyData['membership_rank']?['rank_name'] != null
                            ? 'Thành viên (${widget.loyaltyData['membership_rank']['rank_name']})'
                            : 'Thành viên')
                        .toUpperCase(),
                    style: TextStyle(
                      color: const Color(0xFFE3B707),
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.2,
                      shadows: [
                        Shadow(
                          blurRadius: 4.0,
                          color: Colors.black.withOpacity(0.3),
                          offset: const Offset(1.0, 1.0),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 8),
                  // Total spent
                  Row(
                    children: [
                      const Text(
                        'Chi tiêu tích lũy: ',
                        style: TextStyle(color: Color(0xFFD0C6AB), fontSize: 13),
                      ),
                      Text(
                        '${_formatCurrency(widget.loyaltyData['total_spent'])} đ',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  // Progress bar to next rank
                  if (nextRank == null)
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          height: 6,
                          width: double.infinity,
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [Color(0xFFE9C400), Color(0xFFFFE16D)],
                            ),
                            borderRadius: BorderRadius.circular(3),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            const Icon(
                              Icons.verified_outlined,
                              color: Color(0xFFFFE16D),
                              size: 16,
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'Chúc mừng! Bạn đang ở hạng thẻ cao nhất.',
                                style: TextStyle(
                                  color: const Color(0xFFD0C6AB).withOpacity(0.8),
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    )
                  else
                    Builder(builder: (context) {
                      final minSpend = _parseDouble(nextRank['min_spend']);
                      final progress =
                          minSpend > 0 ? (totalSpent / minSpend).clamp(0.0, 1.0) : 1.0;
                      final remaining = (minSpend - totalSpent).clamp(0.0, double.infinity);

                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Stack(
                            children: [
                              Container(
                                height: 6,
                                width: double.infinity,
                                decoration: BoxDecoration(
                                  color: const Color(0xFF1F2B3C),
                                  borderRadius: BorderRadius.circular(3),
                                ),
                              ),
                              FractionallySizedBox(
                                widthFactor: progress,
                                child: Container(
                                  height: 6,
                                  decoration: BoxDecoration(
                                    gradient: const LinearGradient(
                                      colors: [Color(0xFFE9C400), Color(0xFFFFE16D)],
                                    ),
                                    borderRadius: BorderRadius.circular(3),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Tiến trình hạng ${nextRank['rank_name'] ?? ''}',
                                style: const TextStyle(color: Color(0xFFD0C6AB), fontSize: 12),
                              ),
                              Text(
                                'Cần thêm ${_formatCurrency(remaining)} đ',
                                style: const TextStyle(
                                  color: Color(0xFFFFE16D),
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ],
                      );
                    }),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHistory() {
    final history = widget.loyaltyData['point_history'] as List<dynamic>? ?? [];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Theme.of(context).dividerColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Lịch sử điểm',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
          ),
          const SizedBox(height: 12),
          if (history.isEmpty)
            Text(
              'Chưa có lịch sử giao dịch.',
              style: TextStyle(color: Colors.grey[500], fontStyle: FontStyle.italic),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: history.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final item = history[index] as Map<String, dynamic>;
                final points = _parseDouble(item['points_changed']).toInt();
                final isPositive = points >= 0;
                final color = isPositive ? Colors.green : Colors.red;
                final prefix = isPositive ? '+' : '';

                String dateStr = '';
                if (item['created_at'] != null) {
                  try {
                    final dt = DateTime.parse(item['created_at'].toString());
                    dateStr = DateFormat('dd/MM/yyyy HH:mm').format(dt.toLocal());
                  } catch (_) {}
                }

                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  child: Row(
                    children: [
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: (isPositive ? Colors.green : Colors.red).withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(
                          isPositive ? Icons.add_circle_outline : Icons.remove_circle_outline,
                          color: color,
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item['description']?.toString() ?? 'Giao dịch điểm',
                              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                            ),
                            if (dateStr.isNotEmpty) ...[
                              const SizedBox(height: 2),
                              Text(
                                dateStr,
                                style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                              ),
                            ],
                          ],
                        ),
                      ),
                      Text(
                        '$prefix$points điểm',
                        style: TextStyle(
                          color: color,
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
        ],
      ),
    );
  }

  void _confirmCancel(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Hủy thẻ hội viên'),
        content: const Text(
          'Bạn có chắc chắn muốn hủy đăng ký thẻ hội viên không?\n\nMọi quyền lợi và điểm tích lũy có thể bị ảnh hưởng.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Không'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () {
              Navigator.pop(ctx);
              widget.onCancelLoyalty();
            },
            child: const Text('Hủy thẻ', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}
