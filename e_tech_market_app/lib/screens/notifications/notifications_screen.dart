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
  Set<int> _expandedIds = {};

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
    if (iconData == Icons.warning_amber_rounded) return Colors.red;
    return Colors.blue; // Default fallback like image
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
      backgroundColor: Theme.of(context).colorScheme.surface,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  InkWell(
                    onTap: () => Navigator.of(context).pop(),
                    borderRadius: BorderRadius.circular(20),
                    child: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.onSurface.withOpacity(0.05),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(Icons.arrow_back, color: Theme.of(context).colorScheme.onSurface, size: 22),
                    ),
                  ),
                  if (_unreadCount > 0)
                    TextButton.icon(
                      onPressed: _markAllAsRead,
                      icon: Icon(Icons.done_all, size: 18, color: Theme.of(context).colorScheme.primary),
                      label: Text(
                        'Đánh dấu đã đọc',
                        style: TextStyle(color: Theme.of(context).colorScheme.primary, fontWeight: FontWeight.w600),
                      ),
                    ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Text(
                    'Hộp thư thông báo',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w900,
                      color: Theme.of(context).colorScheme.onSurface,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Xem tất cả các tin tức công nghệ, cảnh báo kho và cập nhật đơn hàng của bạn.',
                    style: TextStyle(
                      fontSize: 14,
                      color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                      height: 1.5,
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                children: [
                  _buildTab('Tất cả', 'all', _notifications.length),
                  const SizedBox(width: 24),
                  _buildTab('Chưa đọc', 'unread', _unreadCount),
                  const SizedBox(width: 24),
                  _buildTab('Đã đọc', 'read', _notifications.length - _unreadCount),
                ],
              ),
            ),
            Divider(height: 1, color: Theme.of(context).colorScheme.outline.withOpacity(0.4)),
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _error != null
                      ? Center(child: Text(_error!))
                      : _filteredNotifications.isEmpty
                          ? _buildEmptyState()
                          : ListView.separated(
                              padding: const EdgeInsets.all(20),
                              itemCount: _filteredNotifications.length,
                              separatorBuilder: (_, __) => const SizedBox(height: 16),
                              itemBuilder: (context, index) {
                                final notif = _filteredNotifications[index];
                                return _buildNotificationCard(notif);
                              },
                            ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTab(String label, String value, int count) {
    final isSelected = _filter == value;
    final primaryColor = const Color(0xFFF26522);
    final unselectedColor = Theme.of(context).colorScheme.onSurface.withOpacity(0.6);

    return GestureDetector(
      onTap: () => setState(() => _filter = value),
      child: Container(
        padding: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(
              color: isSelected ? primaryColor : Colors.transparent,
              width: 2,
            ),
          ),
        ),
        child: Row(
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 15,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                color: isSelected ? primaryColor : unselectedColor,
              ),
            ),
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: isSelected ? primaryColor.withOpacity(0.15) : Theme.of(context).colorScheme.onSurface.withOpacity(0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                count.toString(),
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: isSelected ? primaryColor : unselectedColor,
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
          Icon(Icons.notifications_off_outlined, size: 64, color: Theme.of(context).colorScheme.onSurface.withOpacity(0.2)),
          const SizedBox(height: 16),
          Text(
            _filter == 'unread'
                ? 'Bạn không có thông báo chưa đọc nào.'
                : 'Bạn chưa có thông báo nào.',
            style: TextStyle(fontSize: 15, color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6)),
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
    final isExpanded = _expandedIds.contains(notif['id']);
    
    final onSurfaceColor = Theme.of(context).colorScheme.onSurface;

    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: Theme.of(context).colorScheme.outline.withOpacity(0.3)),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(6),
        child: IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(width: 4, color: iconColor),
              Expanded(
                child: InkWell(
                  onTap: () {
                    setState(() {
                      if (isExpanded) {
                        _expandedIds.remove(notif['id']);
                      } else {
                        _expandedIds.add(notif['id'] as int);
                        if (!isRead) _markAsRead(notif['id'] as int);
                      }
                    });
                  },
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: iconColor.withOpacity(0.15),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(iconData, size: 20, color: iconColor),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    title,
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                      color: onSurfaceColor,
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  Row(
                                    children: [
                                      Text(
                                        createdAt,
                                        style: TextStyle(fontSize: 12, color: onSurfaceColor.withOpacity(0.5)),
                                      ),
                                      const SizedBox(width: 8),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: onSurfaceColor.withOpacity(0.1),
                                          borderRadius: BorderRadius.circular(12),
                                        ),
                                        child: Text(
                                          isRead ? 'Đã đọc' : 'Chưa đọc',
                                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: onSurfaceColor.withOpacity(0.6)),
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),
                            Icon(
                              isExpanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                              color: onSurfaceColor.withOpacity(0.5),
                            ),
                          ],
                        ),
                        if (isExpanded) ...[
                          const SizedBox(height: 16),
                          Divider(height: 1, color: Theme.of(context).colorScheme.outline.withOpacity(0.4)),
                          const SizedBox(height: 16),
                          Text(
                            body,
                            style: TextStyle(
                              fontSize: 14,
                              color: onSurfaceColor.withOpacity(0.8),
                              height: 1.5,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
