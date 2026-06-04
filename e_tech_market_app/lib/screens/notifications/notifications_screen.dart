import 'package:flutter/material.dart';

import '../../services/notification_service.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<dynamic> _notifications = [];
  bool _isLoading = true;
  String? _error;
  int _unreadCount = 0;
  String _filter = 'all';

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await NotificationService.fetchNotifications(page: 1, perPage: 50);
      setState(() {
        _notifications = response['data'] ?? [];
        _unreadCount = response['unread'] ?? 0;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _markAsRead(int id) async {
    try {
      await NotificationService.markAsRead(id);
      _loadNotifications();
    } catch (_) {}
  }

  Future<void> _markAllAsRead() async {
    try {
      await NotificationService.markAllAsRead();
      _loadNotifications();
    } catch (_) {}
  }

  String _formatDateTime(String? isoDate) {
    if (isoDate == null) return '—';
    try {
      final dt = DateTime.parse(isoDate).toLocal();
      final h = dt.hour.toString().padLeft(2, '0');
      final m = dt.minute.toString().padLeft(2, '0');
      final d = dt.day.toString().padLeft(2, '0');
      final mo = dt.month.toString().padLeft(2, '0');
      final y = dt.year.toString();
      return '$h:$m $d/$mo/$y';
    } catch (_) {
      return '—';
    }
  }

  IconData _getIconData(String? type, String? title, String? body) {
    final t = (type ?? '').toLowerCase();
    final ti = (title ?? '').toLowerCase();
    final b = (body ?? '').toLowerCase();

    if (t.contains('blog') || t.contains('post') || ti.contains('tin tức') || ti.contains('bài viết')) {
      return Icons.article_outlined;
    }
    if (t.contains('order') || t.contains('return') || ti.contains('đơn hàng') || ti.contains('vận chuyển') || ti.contains('thanh toán')) {
      return Icons.local_shipping_outlined;
    }
    if (t.contains('warning') || t.contains('alert') || ti.contains('tồn kho') || ti.contains('cảnh báo') || b.contains('hết hàng') || b.contains('sắp hết')) {
      return Icons.warning_amber_rounded;
    }
    return Icons.notifications_none;
  }

  Color _getIconColor(String? type, String? title, String? body) {
    final iconData = _getIconData(type, title, body);
    if (iconData == Icons.article_outlined) return Colors.blue;
    if (iconData == Icons.local_shipping_outlined) return Colors.green;
    if (iconData == Icons.warning_amber_rounded) return Colors.orange;
    return const Color(0xFFEF7A45);
  }

  List<dynamic> get _filteredNotifications {
    if (_filter == 'unread') {
      return _notifications.where((n) => n['read_at'] == null).toList();
    } else if (_filter == 'read') {
      return _notifications.where((n) => n['read_at'] != null).toList();
    }
    return _notifications;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Hộp thư thông báo', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
        actions: [
          if (_unreadCount > 0)
            IconButton(
              icon: const Icon(Icons.done_all, color: Color(0xFF64748B)),
              tooltip: 'Đánh dấu đọc tất cả',
              onPressed: _markAllAsRead,
            ),
        ],
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildFilterChip('Tất cả', 'all', _notifications.length),
                  const SizedBox(width: 8),
                  _buildFilterChip('Chưa đọc', 'unread', _unreadCount, highlight: true),
                  const SizedBox(width: 8),
                  _buildFilterChip('Đã đọc', 'read', _notifications.length - _unreadCount),
                ],
              ),
            ),
          ),
          const Divider(height: 1, color: Color(0xFFE2E8F0)),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                    ? Center(child: Text(_error!))
                    : _filteredNotifications.isEmpty
                        ? _buildEmptyState()
                        : ListView.separated(
                            padding: const EdgeInsets.all(16),
                            itemCount: _filteredNotifications.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 12),
                            itemBuilder: (context, index) {
                              final notif = _filteredNotifications[index];
                              return _buildNotificationCard(notif);
                            },
                          ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, String value, int count, {bool highlight = false}) {
    final isSelected = _filter == value;
    return InkWell(
      onTap: () => setState(() => _filter = value),
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFEF7A45) : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                color: isSelected ? Colors.white : const Color(0xFF475569),
              ),
            ),
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: isSelected ? Colors.white.withValues(alpha: 0.2) : (highlight && count > 0 ? Colors.red : const Color(0xFFCBD5E1)),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                count.toString(),
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: isSelected ? Colors.white : (highlight && count > 0 ? Colors.white : const Color(0xFF475569)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.notifications_off_outlined, size: 64, color: Colors.grey.shade400),
          const SizedBox(height: 16),
          Text(
            _filter == 'unread'
                ? 'Tuyệt vời! Bạn không có thông báo chưa đọc nào.'
                : 'Bạn chưa có thông báo nào.',
            style: const TextStyle(fontSize: 15, color: Colors.black54),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildNotificationCard(Map<String, dynamic> notif) {
    final isRead = notif['read_at'] != null;
    final title = notif['title']?.toString() ?? 'Thông báo';
    final body = notif['body']?.toString() ?? '';
    final createdAt = _formatDateTime(notif['created_at']?.toString());
    
    final iconData = _getIconData(notif['type']?.toString(), title, body);
    final iconColor = _getIconColor(notif['type']?.toString(), title, body);

    return InkWell(
      onTap: () {
        if (!isRead) {
          _markAsRead(notif['id'] as int);
        }
        // Handle navigation based on data if needed
      },
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isRead ? Colors.white : const Color(0xFFFFF7ED),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: isRead ? const Color(0xFFE2E8F0) : const Color(0xFFFFEDD5), width: 1),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.02),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: isRead ? const Color(0xFFF8FAFC) : iconColor.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(iconData, size: 20, color: isRead ? const Color(0xFF94A3B8) : iconColor),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          title,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: isRead ? FontWeight.w600 : FontWeight.bold,
                            color: isRead ? const Color(0xFF475569) : const Color(0xFF0F172A),
                          ),
                        ),
                      ),
                      if (!isRead) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(color: Colors.red, borderRadius: BorderRadius.circular(4)),
                          child: const Text('Mới', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                        ),
                      ]
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    body,
                    style: TextStyle(
                      fontSize: 13,
                      color: isRead ? const Color(0xFF64748B) : const Color(0xFF334155),
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    createdAt,
                    style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
