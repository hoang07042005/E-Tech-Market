import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

class OrderStatusCard extends StatelessWidget {
  final Map<String, dynamic> order;

  const OrderStatusCard({super.key, required this.order});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final orderCode = order['order_code']?.toString() ?? 'N/A';
    final statusText = order['status_text']?.toString() ?? 'N/A';
    final status = order['status']?.toString() ?? '';
    final paymentStatusText = order['payment_status_text']?.toString() ?? 'N/A';
    final totalAmount = (order['total_amount'] as num?)?.toDouble() ?? 0;
    final itemsCount = (order['items_count'] as num?)?.toInt() ?? 0;
    final createdAt = order['created_at']?.toString();

    final formatter = NumberFormat('#,###', 'vi_VN');

    // Status color
    Color statusColor;
    IconData statusIcon;
    switch (status) {
      case 'pending':
        statusColor = const Color(0xFFF59E0B);
        statusIcon = Icons.schedule_rounded;
        break;
      case 'confirmed':
      case 'processing':
        statusColor = const Color(0xFF3B82F6);
        statusIcon = Icons.inventory_2_outlined;
        break;
      case 'shipping':
        statusColor = const Color(0xFF8B5CF6);
        statusIcon = Icons.local_shipping_outlined;
        break;
      case 'delivered':
      case 'completed':
        statusColor = const Color(0xFF10B981);
        statusIcon = Icons.check_circle_outline;
        break;
      case 'cancelled':
        statusColor = const Color(0xFFEF4444);
        statusIcon = Icons.cancel_outlined;
        break;
      default:
        statusColor = const Color(0xFF94A3B8);
        statusIcon = Icons.info_outline;
    }

    String? formattedDate;
    if (createdAt != null) {
      try {
        final dt = DateTime.parse(createdAt);
        formattedDate = DateFormat('dd/MM/yyyy HH:mm').format(dt.toLocal());
      } catch (_) {}
    }

    return Container(
      margin: const EdgeInsets.only(left: 56, right: 16, top: 4, bottom: 4),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: isDark
              ? [const Color(0xFF1E293B), const Color(0xFF0F172A)]
              : [Colors.white, const Color(0xFFF8FAFC)],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: statusColor.withValues(alpha: 0.3),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: statusColor.withValues(alpha: 0.1),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(Icons.receipt_long_rounded,
                    color: statusColor, size: 20),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Đơn hàng #$orderCode',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: isDark
                            ? const Color(0xFFE2E8F0)
                            : const Color(0xFF1E293B),
                      ),
                    ),
                    if (formattedDate != null)
                      Text(
                        formattedDate,
                        style: TextStyle(
                          fontSize: 11,
                          color: isDark
                              ? const Color(0xFF94A3B8)
                              : const Color(0xFF64748B),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          // Status badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: statusColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: statusColor.withValues(alpha: 0.3)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(statusIcon, color: statusColor, size: 16),
                const SizedBox(width: 6),
                Text(
                  statusText,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: statusColor,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          // Info rows
          _buildInfoRow(
            context,
            icon: Icons.payments_outlined,
            label: 'Thanh toán',
            value: paymentStatusText,
            isDark: isDark,
          ),
          const SizedBox(height: 6),
          _buildInfoRow(
            context,
            icon: Icons.shopping_bag_outlined,
            label: 'Số sản phẩm',
            value: '$itemsCount sản phẩm',
            isDark: isDark,
          ),
          const SizedBox(height: 6),
          _buildInfoRow(
            context,
            icon: Icons.monetization_on_outlined,
            label: 'Tổng tiền',
            value: '${formatter.format(totalAmount)}đ',
            isDark: isDark,
            valueColor: const Color(0xFFF26522),
            valueBold: true,
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(
    BuildContext context, {
    required IconData icon,
    required String label,
    required String value,
    required bool isDark,
    Color? valueColor,
    bool valueBold = false,
  }) {
    return Row(
      children: [
        Icon(
          icon,
          size: 14,
          color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
        ),
        const SizedBox(width: 6),
        Text(
          '$label: ',
          style: TextStyle(
            fontSize: 12,
            color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: TextStyle(
              fontSize: 12,
              fontWeight: valueBold ? FontWeight.w700 : FontWeight.w500,
              color: valueColor ??
                  (isDark
                      ? const Color(0xFFE2E8F0)
                      : const Color(0xFF1E293B)),
            ),
            textAlign: TextAlign.right,
          ),
        ),
      ],
    );
  }
}
