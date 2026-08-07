import 'dart:convert';
import 'package:flutter/material.dart';
import '../../config/dio_client.dart';
import '../../utils/network_utils.dart';
import 'trande_in_history_detail.dart';

class TradeInHistoryScreen extends StatefulWidget {
  const TradeInHistoryScreen({super.key});

  @override
  State<TradeInHistoryScreen> createState() => _TradeInHistoryScreenState();
}

class _TradeInHistoryScreenState extends State<TradeInHistoryScreen> {
  bool _isLoading = true;
  List<dynamic> _requests = [];
  String _activeFilter = 'all';

  final List<Map<String, dynamic>> _filters = [
    {
      'key': 'all',
      'label': 'Tất cả yêu cầu',
      'icon': Icons.grid_view_rounded,
      'color': const Color(0xFFFF5722)
    },
    {
      'key': 'completed',
      'label': 'Đã thu mua',
      'icon': Icons.check_circle_outline,
      'color': Colors.green
    },
    {
      'key': 'processing',
      'label': 'Đang xử lý',
      'icon': Icons.hourglass_empty,
      'color': const Color(0xFFEF7A45)
    },
    {
      'key': 'pending',
      'label': 'Chờ kiểm tra',
      'icon': Icons.search,
      'color': Colors.blue
    },
    {
      'key': 'approved',
      'label': 'Đã hoàn tất',
      'icon': Icons.assignment_turned_in_outlined,
      'color': Colors.purple
    },
    {
      'key': 'rejected',
      'label': 'Đã hủy',
      'icon': Icons.cancel_outlined,
      'color': Colors.grey.shade600
    },
  ];

  static const Map<String, Map<String, String>> _statusMap = {
    'pending': {
      'label': 'Chờ kiểm tra',
      'filterKey': 'pending',
      'color': 'gray'
    },
    'quoted': {
      'label': 'Đang xử lý',
      'filterKey': 'processing',
      'color': 'orange'
    },
    'approved': {
      'label': 'Đã hoàn tất',
      'filterKey': 'approved',
      'color': 'green'
    },
    'rejected': {'label': 'Đã hủy', 'filterKey': 'rejected', 'color': 'red'},
    'completed': {
      'label': 'Đã thu mua',
      'filterKey': 'completed',
      'color': 'green'
    },
  };

  @override
  void initState() {
    super.initState();
    _fetchHistory();
  }

  Future<void> _fetchHistory() async {
    setState(() => _isLoading = true);
    try {
      final res = await DioClient.instance.get('/me/trade-in');
      final data = res.data;
      if (data != null && data['status'] == 'success') {
        if (mounted) {
          setState(() {
            _requests = data['data'] ?? [];
          });
        }
      }
    } catch (e) {
      debugPrint('Error fetching trade-in history: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  List<String> _parseImages(dynamic imgs) {
    if (imgs == null) return [];
    if (imgs is List) return imgs.map((e) => e.toString()).toList();
    if (imgs is String) {
      try {
        final parsed = jsonDecode(imgs);
        if (parsed is List) return parsed.map((e) => e.toString()).toList();
      } catch (_) {}
    }
    return [];
  }

  Map<String, dynamic> _parseInfoLines(String? machineInfo) {
    final lines = (machineInfo ?? '')
        .split('\n')
        .where((l) => l.trim().isNotEmpty)
        .toList();
    String name = '';
    if (lines.isNotEmpty) {
      name = lines[0].replaceAll(RegExp(r'^Tên máy:\s*'), '').trim();
    }
    List<Map<String, String>> specs = [];
    for (int i = 1; i < lines.length; i++) {
      final line = lines[i];
      final colonIdx = line.indexOf(':');
      if (colonIdx > -1) {
        specs.add({
          'key': line.substring(0, colonIdx).trim(),
          'val': line.substring(colonIdx + 1).trim()
        });
      } else {
        specs.add({'key': '', 'val': line.trim()});
      }
    }
    return {'name': name, 'specs': specs};
  }

  Color _getStatusColor(String colorKey) {
    switch (colorKey) {
      case 'gray':
        return Colors.grey;
      case 'orange':
        return const Color(0xFFEF7A45);
      case 'green':
        return Colors.green;
      case 'red':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  String _formatPrice(dynamic price) {
    if (price == null || price.toString().isEmpty) return '';
    final val = double.tryParse(price.toString()) ?? 0.0;
    return '${val.toStringAsFixed(0).replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]}.')} ₫';
  }

  Widget _buildFallbackImage() {
    return Container(
      width: 70,
      height: 70,
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Icon(Icons.image_outlined, color: Colors.grey.shade400, size: 28),
    );
  }

  @override
  Widget build(BuildContext context) {
    final filteredRequests = _requests.where((r) {
      if (_activeFilter == 'all') return true;
      final status = r['status']?.toString() ?? '';
      final filterKey = _statusMap[status]?['filterKey'];
      return filterKey == _activeFilter;
    }).toList();

    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      appBar: AppBar(
        title: Text('Lịch sử Thu cũ',
            style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 18,
                color: Theme.of(context).colorScheme.onSurface)),
        backgroundColor: Theme.of(context).colorScheme.surface,
        elevation: 0,
        centerTitle: false,
      ),
      body: Column(
        children: [
          // Filter Tabs (Flat Text Style)
          Container(
            height: 48,
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              border: Border(
                  bottom: BorderSide(
                      color: Theme.of(context)
                          .colorScheme
                          .onSurface
                          .withOpacity(0.1),
                      width: 1)),
            ),
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: EdgeInsets.zero,
              itemCount: _filters.length,
              itemBuilder: (context, index) {
                final f = _filters[index];
                final isSelected = _activeFilter == f['key'];

                return InkWell(
                  onTap: () =>
                      setState(() => _activeFilter = f['key'] as String),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    decoration: BoxDecoration(
                      border: Border(
                        bottom: BorderSide(
                          color: isSelected
                              ? const Color(0xFFFF5722)
                              : Colors.transparent,
                          width: 2.5,
                        ),
                      ),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      f['label'] as String,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight:
                            isSelected ? FontWeight.bold : FontWeight.w500,
                        color: isSelected
                            ? const Color(0xFFFF5722)
                            : const Color(0xFF8B95A5),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),

          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : ListView.builder(
                    padding: const EdgeInsets.only(bottom: 24),
                    itemCount:
                        filteredRequests.isEmpty ? 1 : filteredRequests.length,
                    itemBuilder: (context, index) {
                      if (filteredRequests.isEmpty) {
                        return Container(
                          padding: const EdgeInsets.symmetric(vertical: 40),
                          alignment: Alignment.center,
                          child: Text(
                            _activeFilter == 'all'
                                ? 'Bạn chưa gửi yêu cầu thu cũ nào.'
                                : 'Không có yêu cầu nào trong mục này.',
                            style: TextStyle(
                                color: Colors.grey.shade600, fontSize: 14),
                          ),
                        );
                      }

                      final req = filteredRequests[index];
                      final status = req['status']?.toString() ?? '';
                      final statusInfo = _statusMap[status] ??
                          {'label': status, 'color': 'gray'};

                      final imgs = _parseImages(req['images']);
                      final thumb = imgs.isNotEmpty
                          ? NetworkUtils.fixDeviceUrl(imgs[0])
                          : null;

                      final info = _parseInfoLines(req['machine_info']);
                      final name = info['name'] as String;
                      final specs = info['specs'] as List<Map<String, String>>;
                      final shortSpec =
                          specs.take(4).map((s) => s['val']).join(" • ");

                      final createdAt = DateTime.tryParse(
                          req['created_at']?.toString() ?? '');
                      final dateStr = createdAt != null
                          ? '${createdAt.day.toString().padLeft(2, '0')}/${createdAt.month.toString().padLeft(2, '0')}/${createdAt.year}'
                          : '';
                      final timeStr = createdAt != null
                          ? '${createdAt.hour.toString().padLeft(2, '0')}:${createdAt.minute.toString().padLeft(2, '0')}'
                          : '';

                      final conditions = req['conditions'] as List?;
                      final conditionStr =
                          conditions != null && conditions.isNotEmpty
                              ? conditions.map((c) {
                                  final name = c['name'] as String;
                                  final parts = name.split(':');
                                  return parts.length > 1
                                      ? parts.sublist(1).join(':').trim()
                                      : name.trim();
                                }).join(', ')
                              : '';

                      final updatedAt = DateTime.tryParse(
                          req['updated_at']?.toString() ?? '');
                      final updatedDateStr = updatedAt != null
                          ? '${updatedAt.day.toString().padLeft(2, '0')}/${updatedAt.month.toString().padLeft(2, '0')}/${updatedAt.year} ${updatedAt.hour.toString().padLeft(2, '0')}:${updatedAt.minute.toString().padLeft(2, '0')}'
                          : '';

                      final estPrice = req['estimated_price'];
                      final finalPrice = req['final_price'];
                      final hasAnyPrice =
                          estPrice != null || finalPrice != null;

                      return Padding(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 8),
                        child: InkWell(
                          onTap: () async {
                            final result = await Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => TradeInHistoryDetailScreen(
                                  tradeInRequest: req,
                                ),
                              ),
                            );
                            if (result == true) {
                              _fetchHistory();
                            }
                          },
                          borderRadius: BorderRadius.circular(16),
                          child: CustomPaint(
                            foregroundPainter: DashedBottomBorderPainter(
                              color: const Color.fromARGB(255, 253, 100, 4),
                              width: 1,
                            ),
                            child: Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: Theme.of(context).colorScheme.surface,
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.04),
                                    blurRadius: 10,
                                    offset: const Offset(0, 4),
                                  ),
                                ],
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // Header: Date & Status
                                  Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: [
                                      Row(
                                        children: [
                                          Icon(Icons.calendar_today_outlined,
                                              size: 14,
                                              color: Theme.of(context)
                                                  .colorScheme
                                                  .onSurface),
                                          const SizedBox(width: 4),
                                          Text(
                                            dateStr,
                                            style: TextStyle(
                                                fontSize: 12,
                                                color: Theme.of(context)
                                                    .colorScheme
                                                    .onSurface,
                                                fontWeight: FontWeight.w500),
                                          ),
                                          const SizedBox(width: 12),
                                          Icon(Icons.access_time,
                                              size: 14,
                                              color: Theme.of(context)
                                                  .colorScheme
                                                  .onSurface),
                                          const SizedBox(width: 4),
                                          Text(
                                            timeStr,
                                            style: TextStyle(
                                                fontSize: 12,
                                                color: Theme.of(context)
                                                    .colorScheme
                                                    .onSurface,
                                                fontWeight: FontWeight.w500),
                                          ),
                                        ],
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 10, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: _getStatusColor(
                                                  statusInfo['color']!)
                                              .withOpacity(0.1),
                                          borderRadius:
                                              BorderRadius.circular(6),
                                          border: Border.all(
                                              color: _getStatusColor(
                                                      statusInfo['color']!)
                                                  .withOpacity(0.3)),
                                        ),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Icon(Icons.check_circle_outline,
                                                size: 12,
                                                color: _getStatusColor(
                                                    statusInfo['color']!)),
                                            const SizedBox(width: 4),
                                            Text(
                                              statusInfo['label']!,
                                              style: TextStyle(
                                                color: _getStatusColor(
                                                    statusInfo['color']!),
                                                fontSize: 12,
                                                fontWeight: FontWeight.w600,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 16),

                                  // Body: Image + Device Info + Arrow
                                  Row(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      if (thumb != null)
                                        Container(
                                          decoration: BoxDecoration(
                                            color: Theme.of(context)
                                                .colorScheme
                                                .surface,
                                            borderRadius:
                                                BorderRadius.circular(12),
                                          ),
                                          child: ClipRRect(
                                            borderRadius:
                                                BorderRadius.circular(12),
                                            child: Image.network(
                                              thumb,
                                              width: 86,
                                              height: 86,
                                              fit: BoxFit.cover,
                                              errorBuilder: (_, __, ___) =>
                                                  _buildFallbackImage(),
                                            ),
                                          ),
                                        )
                                      else
                                        _buildFallbackImage(),
                                      const SizedBox(width: 14),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              name.isNotEmpty
                                                  ? name
                                                  : (req['category']?['name'] ??
                                                      'Thiết bị'),
                                              style: TextStyle(
                                                  fontWeight: FontWeight.w700,
                                                  fontSize: 16,
                                                  color: Theme.of(context)
                                                      .colorScheme
                                                      .onSurface,
                                                  height: 1.2),
                                            ),
                                            const SizedBox(height: 6),
                                            ...specs.map((s) => Padding(
                                                  padding:
                                                      const EdgeInsets.only(
                                                          bottom: 3),
                                                  child: Text(
                                                    '${s['key']}: ${s['val']}',
                                                    style: TextStyle(
                                                        fontSize: 14,
                                                        color: Theme.of(context)
                                                            .colorScheme
                                                            .onSurface),
                                                  ),
                                                )),
                                            const SizedBox(height: 6),
                                            RichText(
                                              text: TextSpan(
                                                style: TextStyle(
                                                    fontSize: 13.5,
                                                    color: Theme.of(context)
                                                        .colorScheme
                                                        .onSurface),
                                                children: [
                                                  const TextSpan(
                                                      text: 'Mã yêu cầu: '),
                                                  TextSpan(
                                                    text:
                                                        '#${req['request_code']}',
                                                    style: const TextStyle(
                                                        fontWeight:
                                                            FontWeight.w600,
                                                        color: Colors.red),
                                                  ),
                                                ],
                                              ),
                                            ),
                                            const SizedBox(height: 4),
                                            Text(
                                              'Ngày gửi: $dateStr • $timeStr',
                                              style: TextStyle(
                                                  fontSize: 13,
                                                  color: Theme.of(context)
                                                      .colorScheme
                                                      .onSurface),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),

                                  if (conditions != null &&
                                      conditions.isNotEmpty) ...[
                                    const SizedBox(height: 14),
                                    Wrap(
                                      spacing: 8,
                                      runSpacing: 8,
                                      children: conditions.map<Widget>((c) {
                                        final cName = c['name'] as String;
                                        final parts = cName.split(':');
                                        final title = parts.length > 1
                                            ? parts.sublist(1).join(':').trim()
                                            : cName.trim();
                                        return Container(
                                          padding: const EdgeInsets.symmetric(
                                              horizontal: 10, vertical: 6),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFFFFF7ED),
                                            border: Border.all(
                                                color: const Color(0xFFFED7AA)),
                                            borderRadius:
                                                BorderRadius.circular(6),
                                          ),
                                          child: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              const Icon(Icons.error_outline,
                                                  size: 15,
                                                  color: Color(0xFFEA580C)),
                                              const SizedBox(width: 6),
                                              Text(
                                                title,
                                                style: const TextStyle(
                                                  fontSize: 13,
                                                  fontWeight: FontWeight.w500,
                                                  color: Color(0xFF020617),
                                                ),
                                              ),
                                            ],
                                          ),
                                        );
                                      }).toList(),
                                    ),
                                  ],

                                  const SizedBox(height: 16),

                                  // Footer: Price and Update Date
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text('Giá dự kiến',
                                                style: TextStyle(
                                                    fontSize: 12,
                                                    color: Theme.of(context)
                                                        .colorScheme
                                                        .onSurface)),
                                            const SizedBox(height: 4),
                                            Text(
                                              estPrice != null
                                                  ? '${_formatPrice(estPrice)} đ'
                                                  : 'Chưa có',
                                              style: const TextStyle(
                                                  fontSize: 15,
                                                  fontWeight: FontWeight.bold,
                                                  color: Color(0xFFFF5722)),
                                            ),
                                          ],
                                        ),
                                      ),
                                      Container(
                                        width: 1,
                                        height: 36,
                                        color: Colors.grey.shade200,
                                      ),
                                      const SizedBox(width: 16),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                                finalPrice != null
                                                    ? 'Giá thu mua'
                                                    : 'Cập nhật lần cuối',
                                                style: TextStyle(
                                                    fontSize: 12,
                                                    color: Theme.of(context)
                                                        .colorScheme
                                                        .onSurface)),
                                            const SizedBox(height: 4),
                                            Text(
                                              finalPrice != null
                                                  ? '${_formatPrice(finalPrice)} đ'
                                                  : (updatedDateStr.isNotEmpty
                                                      ? updatedDateStr
                                                      : 'Chưa có'),
                                              style: TextStyle(
                                                  fontSize: finalPrice != null
                                                      ? 15
                                                      : 13,
                                                  fontWeight: finalPrice != null
                                                      ? FontWeight.bold
                                                      : FontWeight.normal,
                                                  color: finalPrice != null
                                                      ? Colors.green.shade600
                                                      : Theme.of(context)
                                                          .colorScheme
                                                          .onSurface),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                ], // closes children of Column
                              ), // closes Column
                            ), // closes Container
                          ), // closes CustomPaint
                        ), // closes InkWell
                      ); // closes return Padding
                    }, // closes itemBuilder
                  ), // closes ListView.builder
          ), // closes Expanded
        ], // closes children of Column
      ), // closes Column
    );
  }
}

class DashedBottomBorderPainter extends CustomPainter {
  final Color color;
  final double width;

  DashedBottomBorderPainter({required this.color, required this.width});

  @override
  void paint(Canvas canvas, Size size) {
    Paint paint = Paint()
      ..color = color
      ..strokeWidth = width
      ..style = PaintingStyle.stroke;

    double dashWidth = 5, dashSpace = 3, startX = 10;
    while (startX < size.width - 10) {
      canvas.drawLine(
        Offset(startX, size.height - width / 2),
        Offset(startX + dashWidth, size.height - width / 2),
        paint,
      );
      startX += dashWidth + dashSpace;
    }
  }

  @override
  bool shouldRepaint(CustomPainter oldDelegate) => false;
}
