import 'dart:convert';
import 'package:flutter/material.dart';
import '../../config/dio_client.dart';
import '../../utils/network_utils.dart';
import '../../utils/app_snackbar.dart';

class TradeInHistoryDetailScreen extends StatefulWidget {
  final Map<String, dynamic> tradeInRequest;
  const TradeInHistoryDetailScreen({super.key, required this.tradeInRequest});

  @override
  State<TradeInHistoryDetailScreen> createState() =>
      _TradeInHistoryDetailScreenState();
}

class _TradeInHistoryDetailScreenState
    extends State<TradeInHistoryDetailScreen> {
  late Map<String, dynamic> _req;
  bool _isAccepting = false;

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
      'filterKey': 'completed',
      'color': 'green'
    },
    'rejected': {
      'label': 'Đã từ chối',
      'filterKey': 'rejected',
      'color': 'red'
    },
    'completed': {
      'label': 'Đã thu mua',
      'filterKey': 'completed',
      'color': 'green'
    },
  };

  @override
  void initState() {
    super.initState();
    _req = Map<String, dynamic>.from(widget.tradeInRequest);
  }

  Future<void> _handleAcceptQuote() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Xác nhận'),
        content: const Text(
            'Bạn có chắc chắn muốn xác nhận mức giá dự kiến này không?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Hủy')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFEF7A45)),
            child: const Text('Đồng ý', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isAccepting = true);
    try {
      final res =
          await DioClient.instance.post('/me/trade-in/${_req['id']}/accept');
      if (res.data != null && res.data['status'] == 'success') {
        setState(() {
          _req['status'] = 'approved';
        });
        if (mounted)
          AppSnackBar.showSuccess(context, 'Đã xác nhận mức giá thành công!');
      }
    } catch (e) {
      if (mounted)
        AppSnackBar.showError(context, 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      if (mounted) setState(() => _isAccepting = false);
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

  String _formatPrice(dynamic price) {
    if (price == null || price.toString().isEmpty) return '';
    final val = double.tryParse(price.toString()) ?? 0.0;
    return '${val.toStringAsFixed(0).replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]}.')} ₫';
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

  @override
  Widget build(BuildContext context) {
    final status = _req['status']?.toString() ?? '';
    final statusInfo = _statusMap[status] ?? {'label': status, 'color': 'gray'};
    final statusColor = _getStatusColor(statusInfo['color']!);

    final imgs = _parseImages(_req['images']);
    final info = _parseInfoLines(_req['machine_info']);
    final name = info['name'] as String;
    final specs = info['specs'] as List<Map<String, String>>;
    final hasPrice = _req['estimated_price'] != null;
    final hasNote = _req['admin_note'] != null &&
        _req['admin_note'].toString().trim().isNotEmpty;

    final createdAt = DateTime.tryParse(_req['created_at']?.toString() ?? '');
    final dateStr = createdAt != null
        ? '${createdAt.day.toString().padLeft(2, '0')}/${createdAt.month.toString().padLeft(2, '0')}/${createdAt.year} • ${createdAt.hour.toString().padLeft(2, '0')}:${createdAt.minute.toString().padLeft(2, '0')}'
        : '';

    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      appBar: AppBar(
        title: Text('Chi tiết yêu cầu',
            style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 18,
                color: Theme.of(context).colorScheme.onSurface)),
        backgroundColor: Theme.of(context).colorScheme.surface,
        elevation: 0,
        centerTitle: false,
        iconTheme:
            IconThemeData(color: Theme.of(context).colorScheme.onSurface),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context, _req['status'] == 'approved'),
        ),
        actions: [
          Center(
            child: Container(
              margin: const EdgeInsets.only(right: 16),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: statusColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: statusColor.withOpacity(0.3)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                      status == 'completed' || status == 'approved'
                          ? Icons.check_circle_outline
                          : (status == 'rejected'
                              ? Icons.cancel_outlined
                              : Icons.hourglass_empty),
                      color: statusColor,
                      size: 14),
                  const SizedBox(width: 4),
                  Text(
                    statusInfo['label']!,
                    style: TextStyle(
                      color: statusColor,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Section 1: Device Info
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                boxShadow: [
                  BoxShadow(
                      color: Colors.black.withOpacity(0.02),
                      blurRadius: 10,
                      offset: const Offset(0, 4)),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildSectionHeader(
                      Icons.phone_android, 'Thông tin thiết bị', Colors.blue),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (imgs.isNotEmpty)
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Image.network(
                            NetworkUtils.fixDeviceUrl(imgs[0]),
                            width: 80,
                            height: 80,
                            fit: BoxFit.cover,
                          ),
                        )
                      else
                        Container(
                          width: 80,
                          height: 120,
                          decoration: BoxDecoration(
                            color: Colors.grey.shade100,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(Icons.phone_android,
                              color: Colors.grey),
                        ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          children: [
                            _buildCompactInfoRow(
                                'Thiết bị',
                                name.isNotEmpty
                                    ? name
                                    : (_req['category']?['name'] ??
                                        'Thiết bị')),
                            _buildCompactInfoRow(
                                'Mã yêu cầu', '#${_req['request_code']}',
                                valueColor:
                                    const Color.fromARGB(255, 248, 23, 23)),
                            for (var spec in specs)
                              if (spec['key']!.isNotEmpty)
                                _buildCompactInfoRow(
                                    spec['key']!, spec['val']!),
                            _buildCompactInfoRow('Ngày gửi', dateStr),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Section 2: Conditions
            if (_req['conditions'] != null &&
                (_req['conditions'] as List).isNotEmpty) ...[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surface,
                  boxShadow: [
                    BoxShadow(
                        color: Colors.black.withOpacity(0.02),
                        blurRadius: 10,
                        offset: const Offset(0, 4)),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildSectionHeader(Icons.fact_check_outlined,
                        'Tình trạng thiết bị', Colors.orange),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: (_req['conditions'] as List).map((c) {
                        final cName = c['name']?.toString() ?? '';
                        final parts = cName.split(':');
                        final label = parts.length > 1
                            ? parts.sublist(1).join(':').trim()
                            : parts[0].trim();
                        return Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFF7ED),
                            border: Border.all(color: const Color(0xFFFED7AA)),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.error_outline,
                                  size: 15, color: Color(0xFFEA580C)),
                              const SizedBox(width: 6),
                              Text(
                                label,
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
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Section 3: Images
            if (imgs.isNotEmpty) ...[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surface,
                  borderRadius: BorderRadius.circular(6),
                  boxShadow: [
                    BoxShadow(
                        color: Colors.black.withOpacity(0.02),
                        blurRadius: 10,
                        offset: const Offset(0, 4)),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildSectionHeader(Icons.image_outlined,
                        'Hình ảnh thiết bị', Colors.green),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: imgs.map((img) {
                          return Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: Container(
                                color: const Color(0xFFF8FAFC),
                                child: Image.network(
                                  NetworkUtils.fixDeviceUrl(img),
                                  width: 90,
                                  height: 90,
                                  fit: BoxFit.cover,
                                ),
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Section 4: Price
            if (hasPrice || _req['final_price'] != null)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surface,
                  boxShadow: [
                    BoxShadow(
                        color: Colors.black.withOpacity(0.02),
                        blurRadius: 10,
                        offset: const Offset(0, 4)),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: Colors.purple.withOpacity(0.1),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.monetization_on_outlined,
                              color: Colors.purple, size: 20),
                        ),
                        const SizedBox(width: 12),
                        const Expanded(
                          child: Text(
                            'Giá thu mua',
                            style: TextStyle(
                                fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                        ),
                        Text(
                          _formatPrice(
                              _req['final_price'] ?? _req['estimated_price']),
                          style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: Colors.purple),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Giá thu mua đã được thẩm định dựa trên thông tin bạn cung cấp và tình trạng thiết bị.',
                      style: TextStyle(
                          fontSize: 12,
                          color: Theme.of(context).colorScheme.onSurface,
                          height: 1.4),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      child: _buildDashedDivider(),
                    ),
                    Text(
                      'Ngày định giá: $dateStr',
                      style: TextStyle(
                          fontSize: 12,
                          color: Theme.of(context).colorScheme.onSurface),
                    ),
                  ],
                ),
              ),
            const SizedBox(height: 16),

            // Section 5: Admin Note
            if (hasNote) ...[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surface,
                  boxShadow: [
                    BoxShadow(
                        color: Colors.black.withOpacity(0.02),
                        blurRadius: 10,
                        offset: const Offset(0, 4)),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildSectionHeader(Icons.chat_bubble_outline,
                        'Ghi chú từ cửa hàng', Colors.orange),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        border: Border(
                            left:
                                BorderSide(color: Color(0xFF3B82F6), width: 2)),
                      ),
                      child: Text(
                        _req['admin_note'].toString(),
                        style: TextStyle(
                            color: Theme.of(context).colorScheme.onSurface,
                            fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Action Buttons
            if (status == 'quoted' && _req['final_price'] != null) ...[
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFFF5722),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  onPressed: _isAccepting ? null : _handleAcceptQuote,
                  child: _isAccepting
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                              color: Colors.white, strokeWidth: 2),
                        )
                      : const Text(
                          'Đồng ý mức giá này',
                          style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: Colors.white),
                        ),
                ),
              ),
              const SizedBox(height: 24),
            ],

            if (status == 'approved') ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF0FDF4),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: const Color(0xFFDCFCE7)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.check, color: Colors.green, size: 16),
                    const SizedBox(width: 8),
                    Expanded(
                      child: RichText(
                        text: const TextSpan(
                          style: TextStyle(color: Colors.green, fontSize: 13),
                          children: [
                            TextSpan(
                                text: 'Bạn đã xác nhận mức giá. Vui lòng '),
                            TextSpan(
                                text: 'mang máy ra cửa hàng',
                                style: TextStyle(fontWeight: FontWeight.bold)),
                            TextSpan(text: ' để hoàn tất thu mua.'),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
            ],

            if (status == 'completed') ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF7ED),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: const Color(0xFFFED7AA)),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.check, color: Color(0xFFEA580C), size: 16),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Giao dịch đã hoàn tất thành công. Cảm ơn bạn đã tin tưởng E-Tech Market!',
                        style:
                            TextStyle(color: Color(0xFF9A3412), fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
            ],

            if (status == 'rejected') ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: const Color(0xFFFECACA)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.close, color: Colors.red, size: 16),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Yêu cầu này đã bị từ chối.',
                        style: const TextStyle(color: Colors.red, fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(IconData icon, String title, Color color) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: color, size: 18),
          ),
          const SizedBox(width: 12),
          Text(
            title,
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }

  Widget _buildCompactInfoRow(String key, String value, {Color? valueColor}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 2,
            child: Text(
              key,
              style: TextStyle(
                  color: Theme.of(context).colorScheme.outline, fontSize: 12),
            ),
          ),
          Expanded(
            flex: 3,
            child: Text(
              value,
              textAlign: TextAlign.left,
              style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 12,
                color: valueColor ?? Theme.of(context).colorScheme.onSurface,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDashedDivider() {
    return LayoutBuilder(
      builder: (BuildContext context, BoxConstraints constraints) {
        final boxWidth = constraints.constrainWidth();
        const dashWidth = 5.0;
        const dashHeight = 1.0;
        final dashCount = (boxWidth / (2 * dashWidth)).floor();
        return Flex(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          direction: Axis.horizontal,
          children: List.generate(dashCount, (_) {
            return SizedBox(
              width: dashWidth,
              height: dashHeight,
              child: DecoratedBox(
                decoration:
                    BoxDecoration(color: Colors.purple.withOpacity(0.2)),
              ),
            );
          }),
        );
      },
    );
  }
}
