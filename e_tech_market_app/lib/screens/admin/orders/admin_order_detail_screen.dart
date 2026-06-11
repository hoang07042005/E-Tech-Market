import 'package:flutter/material.dart';
import 'package:e_tech_market_app/services/admin_orders_service.dart';
import '../../../config/api_config.dart';
// Đảm bảo import đúng đường dẫn chứa file NetworkUtils trong dự án của bạn
import 'package:e_tech_market_app/utils/network_utils.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import '../../../utils/translation.dart';


class AdminOrderDetailScreen extends StatefulWidget {
  final int orderId;
  const AdminOrderDetailScreen({super.key, required this.orderId});

  @override
  State<AdminOrderDetailScreen> createState() => _AdminOrderDetailScreenState();
}

class _AdminOrderDetailScreenState extends State<AdminOrderDetailScreen> {
  bool _isLoading = true;
  String? _error;
  Map<String, dynamic>? _detail;
  String _selectedStatus = 'pending';
  bool _isSavingStatus = false;

  // Bộ điều khiển ô nhập phản hồi, ghi chú của Admin
  final TextEditingController _noteController = TextEditingController();

  // Chứng từ hoàn tiền (ảnh)
  final ImagePicker _picker = ImagePicker();
  List<XFile> _refundProofFiles = [];


  @override
  void initState() {
    super.initState();
    _loadDetail();
  }

  @override
  void dispose() {
    _noteController.dispose(); // Giải phóng bộ nhớ khi thoát màn hình
    super.dispose();
  }

  Future<void> _loadDetail() async {
    setState(() { _isLoading = true; _error = null; });
    try {
      final data = await AdminOrdersService.fetchAdminOrderDetail(widget.orderId);
      
      // DÒNG IN LOG KIỂM TRA: Hãy copy kết quả in ra ở tab Run/Console của VS Code/Android Studio
      print("===== DỮ LIỆU THÔ TỪ BACKEND GỬI VỀ CHÍNH XÁC LÀ: =====");
      print(data.toString());
      print("=====================================================");

      setState(() {
        _detail = data;
        _selectedStatus = data['status'] ?? 'pending';
        _isLoading = false;
      });
    } catch (e) {
      setState(() { _error = e.toString(); _isLoading = false; });
    }
  }

  Future<void> _saveStatus() async {
    if (_selectedStatus == _detail?['status']) return;
    setState(() => _isSavingStatus = true);
    try {
      await AdminOrdersService.updateAdminOrder(widget.orderId, status: _selectedStatus);
      _showSnackBar(Trans.updateStatusSuccess, Colors.green);
      await _loadDetail(); 
      setState(() => _isSavingStatus = false);
    } catch (e) {
      setState(() => _isSavingStatus = false);
      _showSnackBar('Lỗi: ${e.toString()}', Colors.red);
    }
  }

  void _showSnackBar(String msg, Color color) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: color, behavior: SnackBarBehavior.floating),
    );
  }

  // Sử dụng NetworkUtils.fixDeviceUrl để xử lý triệt để IP khi dev trên thiết bị thật/mô phỏng
  String _resolveUrl(String? url) {
    return NetworkUtils.fixDeviceUrl(url);
  }

  String _getResolvedProductImage(Map<String, dynamic> item) {
    String? path = item['image_url']?.toString() ?? item['image']?.toString();

    if ((path == null || path.isEmpty) && item['product'] is Map) {
      final p = item['product'] as Map;
      path = p['main_image_url']?.toString() ?? p['image_url']?.toString() ?? p['image']?.toString();
    }

    return _resolveUrl(path);
  }

  List<DropdownMenuItem<String>> _buildDropdownItems() {
    final currentStatus = _detail?['status'] ?? 'pending';
    final currentStep = _detail?['status_step'] ?? 1;
    
    final List<Map<String, dynamic>> allOptions = [
      {'value': 'pending', 'label': 'Chờ xác nhận', 'step': 1},
      {'value': 'processing', 'label': 'Đã xác nhận', 'step': 2},
      {'value': 'paid', 'label': 'Chuẩn bị hàng', 'step': 3},
      {'value': 'shipped', 'label': 'Đang giao', 'step': 4},
      {'value': 'delivered', 'label': 'Đã giao', 'step': 5},
      {'value': 'completed', 'label': 'Hoàn thành', 'step': 6},
      {'value': 'returned', 'label': 'Hoàn trả', 'step': 7},
      {'value': 'cancelled', 'label': 'Hủy đơn', 'step': 0},
    ];

    List<DropdownMenuItem<String>> menuItems = [];
    for (var opt in allOptions) {
      final val = opt['value'] as String;
      final lbl = opt['label'] as String;
      final step = opt['step'] as int;

      if ((val == 'completed' || val == 'returned' || val == 'cancelled') && currentStatus != val) {
        continue; 
      }
      if (val != 'cancelled' && step > 0 && currentStep > 0 && step < currentStep) {
        continue; 
      }

      menuItems.add(DropdownMenuItem<String>(
        value: val,
        child: Text(lbl, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
      ));
    }

    if (!menuItems.any((item) => item.value == currentStatus)) {
      menuItems.insert(0, DropdownMenuItem<String>(
        value: currentStatus,
        child: Text(_detail?['status_label'] ?? currentStatus, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
      ));
    }
    return menuItems;
  }

  Widget _buildOrderStepsTracker() {
    final currentStatus = _detail?['status'] ?? 'pending';
    final currentStep = _detail?['status_step'] ?? 1;

    final List<Map<String, dynamic>> stepsList = [
      {'value': 'pending', 'label': 'Chờ XN', 'step': 1},
      {'value': 'processing', 'label': 'Đã XN', 'step': 2},
      {'value': 'paid', 'label': 'Chuẩn bị', 'step': 3},
      {'value': 'shipped', 'label': 'Đang giao', 'step': 4},
      {'value': 'delivered', 'label': 'Đã giao', 'step': 5},
    ];

    if (currentStatus == 'cancelled') {
      return Container(
        margin: const EdgeInsets.symmetric(vertical: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: Colors.red.withOpacity(0.06), borderRadius: BorderRadius.circular(8)),
        child: Row(
          children: [
            const Icon(Icons.cancel_rounded, color: Colors.red, size: 18),
            const SizedBox(width: 8),
            Text(Trans.orderCancelled, style: const TextStyle(color: Colors.red, fontWeight: FontWeight.bold, fontSize: 13)),
          ],
        ),
      );
    }

    const Color activeStepColor = Color(0xFF10B981); 

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: List.generate(stepsList.length, (index) {
          final sData = stepsList[index];
          final sStep = sData['step'] as int;
          final sLabel = sData['label'] as String;

          final isDone = currentStep >= sStep;
          final isActive = currentStep == sStep;

          return Expanded(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Divider(
                        color: index == 0 ? Colors.transparent : (isDone ? activeStepColor : const Color(0xFFE2E8F0)), 
                        thickness: 2.2,
                      ),
                    ),
                    Container(
                      width: 22,
                      height: 22,
                      decoration: BoxDecoration(
                        color: isActive ? activeStepColor : (isDone ? activeStepColor.withOpacity(0.12) : Colors.white),
                        border: Border.all(color: isDone ? activeStepColor : const Color(0xFFCBD5E1), width: 2),
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: isDone && !isActive
                            ? const Icon(Icons.check, size: 12, color: activeStepColor)
                            : Text(
                                '${index + 1}',
                                style: TextStyle(
                                  fontSize: 10, 
                                  fontWeight: FontWeight.bold, 
                                  color: isActive ? Colors.white : const Color(0xFF64748B),
                                ),
                              ),
                      ),
                    ),
                    Expanded(
                      child: Divider(
                        color: index == stepsList.length - 1 ? Colors.transparent : (currentStep > sStep ? activeStepColor : const Color(0xFFE2E8F0)), 
                        thickness: 2.2,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  sLabel,
                  style: TextStyle(
                    fontSize: 10, 
                    fontWeight: isActive ? FontWeight.bold : FontWeight.w500, 
                    color: isActive ? activeStepColor : const Color(0xFF64748B),
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          );
        }),
      ),
    );
  }

  Color _statusChipColor(String status) {
    switch (status) {
      case 'pending':
        return const Color(0xFFFFB020);
      case 'approved':
        return const Color(0xFF3B82F6);
      case 'refunded':
        return const Color(0xFF10B981);
      case 'rejected':
        return const Color(0xFFE11D48);
      default:
        return const Color(0xFF64748B);
    }
  }

  String _resolveOrderMediaUrl(dynamic m) {
    final url = (m is Map) ? (m['url'] ?? m['image_url'] ?? m['image'])?.toString() : null;
    return _resolveUrl(url);
  }

  String _resolveCustomerName(Map<String, dynamic>? d) {
    final customer = d?['customer'];
    if (customer is Map) {
      return customer['name']?.toString() ?? '—';
    }
    return '—';
  }

  String _resolveCustomerEmail(Map<String, dynamic>? d) {
    final customer = d?['customer'];
    if (customer is Map) {
      return customer['email']?.toString() ?? '—';
    }
    return '—';
  }

  String _resolveShippingName(Map<String, dynamic>? d) {
    final shipping = d?['shipping'];
    if (shipping is Map) {
      return shipping['name']?.toString() ?? '—';
    }
    return '—';
  }

  String _resolveShippingPhone(Map<String, dynamic>? d) {
    final shipping = d?['shipping'];
    if (shipping is Map) {
      return shipping['phone']?.toString() ?? '—';
    }
    return '—';
  }

  String _resolveShippingAddress(Map<String, dynamic>? d) {
    final shipping = d?['shipping'];
    if (shipping is Map) {
      return shipping['address']?.toString() ?? '—';
    }
    return '—';
  }

  String _resolvePaymentMethod(Map<String, dynamic>? d) {
    final payment = d?['payment'];
    if (payment is Map) {
      final methodStr = payment['method']?.toString().trim().toUpperCase();
      if (methodStr == 'COD') return 'Thanh toán COD';
      if (methodStr == 'VNPAY') return 'Ví VNPay';
      return methodStr ?? '—';
    }
    return '—';
  }

  Widget _buildReturnRequestSection() {
    final rr = _detail?['return_request'];
    if (rr == null) {
      return _buildSectionCard(
        title: Trans.returnRequest,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Center(child: Text(Trans.noReturnRequest, style: TextStyle(color: Theme.of(context).colorScheme.onSurface, fontSize: 13))),
        ),
      );
    }

    final status = rr['status']?.toString() ?? 'pending';
    final content = rr['content']?.toString() ?? '';
    final adminNote = rr['admin_note']?.toString() ?? '';

    final media = (rr['media'] as List?) ?? [];
    final refundProof = (rr['refund_proof'] as List?) ?? [];

    final Color chipColor = _statusChipColor(status);

    return _buildSectionCard(
      title: Trans.returnRequest,
      trailing: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(color: chipColor.withOpacity(0.12), borderRadius: BorderRadius.circular(999)),
        child: Text(status, style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: chipColor)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (content.trim().isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Text(content, style: TextStyle(fontSize: 13, color: Theme.of(context).colorScheme.onSurface)),
            ),

          if (media.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(Trans.images, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F172A))),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: media.take(8).map<Widget>((m) {
                final u = _resolveOrderMediaUrl(m);
                if (u.isEmpty) return const SizedBox.shrink();
                return ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.network(u, width: 76, height: 76, fit: BoxFit.cover, errorBuilder: (c, e, s) {
                    return const SizedBox(width: 76, height: 76, child: Icon(Icons.broken_image_rounded, color: Color(0xFF94A3B8)));
                  }),
                );
              }).toList(),
            ),
          ],

          if (refundProof.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(Trans.refundProof, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F172A))),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: refundProof.take(8).map<Widget>((m) {
                final u = _resolveOrderMediaUrl(m);
                if (u.isEmpty) return const SizedBox.shrink();
                return ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.network(u, width: 76, height: 76, fit: BoxFit.cover, errorBuilder: (c, e, s) {
                    return const SizedBox(width: 76, height: 76, child: Icon(Icons.broken_image_rounded, color: Color(0xFF94A3B8)));
                  }),
                );
              }).toList(),
            ),
          ],

          if (adminNote.trim().isNotEmpty) ...[
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Text(
                Trans.savedReply(adminNote),
                style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurface, fontWeight: FontWeight.w500),
              ),
            ),
          ],

          const SizedBox(height: 12),
          _buildReturnRequestActions(rr, status: status),
        ],
      ),
    );
  }

  Widget _buildReturnRequestActions(Map<String, dynamic> rr, {required String status}) {
    final isPending = status == 'pending';
    final isApproved = status == 'approved';
    final isTerminal = status == 'refunded' || status == 'rejected';

    if (isTerminal) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Ghi chú / Lý do phản hồi từ Admin:', 
          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF475569)),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: _noteController,
          maxLines: 2,
          style: const TextStyle(fontSize: 13),
          decoration: InputDecoration(
            hintText: isPending ? 'Nhập lý do phản hồi (nếu từ chối hoặc cần lưu ý)...' : 'Nhập ghi chú minh chứng hoàn tiền...',
            hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
            contentPadding: const EdgeInsets.all(10),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
          ),
        ),
        const SizedBox(height: 12),

        if (isPending)
          Row(
            children: [
              Expanded(
                child: ElevatedButton(
                  onPressed: _isSavingStatus
                      ? null
                      : () async {
                          setState(() => _isSavingStatus = true);
                          try {
                            final textNote = _noteController.text.trim();
                            await AdminOrdersService.processOrderReturn(
                              widget.orderId, 
                              'approve',
                              adminNote: textNote.isNotEmpty ? textNote : null,
                            );
                            _showSnackBar('Phê duyệt thành công', Colors.green);
                            _noteController.clear(); 
                            await _loadDetail();
                          } catch (e) {
                            _showSnackBar('Lỗi: ${e.toString()}', Colors.red);
                          } finally {
                            setState(() => _isSavingStatus = false);
                          }
                        },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF3B82F6), 
                    foregroundColor: Colors.white, 
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: const Text('Phê duyệt'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: ElevatedButton(
                  onPressed: _isSavingStatus
                      ? null
                      : () async {
                          setState(() => _isSavingStatus = true);
                          try {
                            final textNote = _noteController.text.trim();
                            await AdminOrdersService.processOrderReturn(
                              widget.orderId, 
                              'reject', 
                              adminNote: textNote.isNotEmpty ? textNote : null,
                            );
                            _showSnackBar('Từ chối thành công', Colors.green);
                            _noteController.clear();
                            await _loadDetail();
                          } catch (e) {
                            _showSnackBar('Lỗi: ${e.toString()}', Colors.red);
                          } finally {
                            setState(() => _isSavingStatus = false);
                          }
                        },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFE11D48), 
                    foregroundColor: Colors.white, 
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: const Text('Từ chối'),
                ),
              ),
            ],
          ),

        if (isApproved) ...[
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _isSavingStatus
                      ? null
                      : () async {
                          try {
                            final picked = await _picker.pickMultiImage(imageQuality: 80);
                            if (picked != null && picked.isNotEmpty) {
                              setState(() => _refundProofFiles = picked);
                            }
                          } catch (e) {
                            _showSnackBar('Lỗi chọn ảnh: ${e.toString()}', Colors.red);
                          }
                        },
                  icon: const Icon(Icons.upload_file_rounded),
                  label: const Text('Chọn chứng từ (ảnh)'),
                ),
              ),
            ],
          ),
          if (_refundProofFiles.isNotEmpty) ...[
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _refundProofFiles.map((f) {
                return ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.file(
                    File(f.path),
                    width: 76,
                    height: 76,
                    fit: BoxFit.cover,
                    errorBuilder: (c, e, s) {
                      return const SizedBox(
                        width: 76,
                        height: 76,
                        child: Icon(Icons.broken_image_rounded, color: Color(0xFF94A3B8)),
                      );
                    },
                  ),
                );
              }).toList(),
            ),
          ],
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isSavingStatus
                  ? null
                  : () async {
                      setState(() => _isSavingStatus = true);
                      try {
                        final textNote = _noteController.text.trim();
                        final proofPaths = _refundProofFiles.map((e) => e.path).toList();

                        await AdminOrdersService.processOrderReturn(
                          widget.orderId,
                          'refunded',
                          adminNote: textNote.isNotEmpty ? textNote : null,
                          refundProofPaths: proofPaths,
                        );

                        _showSnackBar('Xác nhận hoàn tiền thành công', Colors.green);
                        _noteController.clear();
                        setState(() => _refundProofFiles = []);
                        await _loadDetail();
                      } catch (e) {
                        _showSnackBar('Lỗi: ${e.toString()}', Colors.red);
                      } finally {
                        setState(() => _isSavingStatus = false);
                      }
                    },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF10B981),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: const Text('Xác nhận đã hoàn tiền'),
            ),
          ),
        ],

      ],
    );
  }

  Widget _buildStatusHistorySection() {
    final history = _detail?['status_history'] as List? ?? [];
    return _buildSectionCard(
      title: Trans.statusHistory,
      trailing: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
        decoration: BoxDecoration(color: Theme.of(context).colorScheme.surface, borderRadius: BorderRadius.circular(12)),
        child: Text('${history.length} lần', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface)),
      ),
      child: history.isEmpty
          ? Padding(
              padding: const EdgeInsets.symmetric(vertical: 16),
              child: Center(child: Text('Chưa ghi nhận lịch sử biến động.', style: TextStyle(color: Theme.of(context).colorScheme.onSurface, fontSize: 13))),
            )
          : Column(
              children: history.map((h) {
                final fromLabel = h['from_label'] ?? '—';
                final toLabel = h['to_label'] ?? h['to_status'] ?? '—';
                final changedAt = h['changed_at'] ?? '';
                final changedBy = h['changed_by']?['name'] ?? 'Hệ thống';
                final note = h['note'] ?? '';

                return Container(
                  margin: const EdgeInsets.symmetric(vertical: 6),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surface,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('$fromLabel  ➔  $toLabel', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Theme.of(context).colorScheme.onSurface)),
                            const SizedBox(height: 4),
                            Text(
                              '${AdminOrdersService.formatViTime(changedAt)} • $changedBy',
                              style: TextStyle(fontSize: 11, color: Theme.of(context).colorScheme.onSurface, fontWeight: FontWeight.w500),
                            ),
                            if (note.toString().trim().isNotEmpty) ...[
                              const SizedBox(height: 6),
                              Text('${Trans.noteWithColon} $note', style: const TextStyle(fontSize: 12, color: Color(0xFF475569), fontStyle: FontStyle.italic)),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final items = _detail?['items'] as List? ?? [];
    final amounts = _detail?['amounts'] ?? {};

    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Theme.of(context).colorScheme.surface,
        foregroundColor: Theme.of(context).colorScheme.onSurface,
        centerTitle: true,
        title: Text(
          _detail?['order_code'] != null ? '${Trans.orders} #${_detail!['order_code']}' : Trans.orderDetailAdmin,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF4F46E5)))
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: Colors.red)))
              : SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildSectionCard(
                        title: Trans.statusManagement,
                        child: Column(
                          children: [
                            _buildOrderStepsTracker(),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                Expanded(
                                  child: DropdownButtonFormField<String>(
                                    value: _selectedStatus,
                                    items: _buildDropdownItems(),
                                    onChanged: (v) => setState(() => _selectedStatus = v ?? 'pending'),
                                    decoration: InputDecoration(
                                      isDense: true,
                                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
                                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                SizedBox(
                                  height: 40,
                                  child: ElevatedButton(
                                    onPressed: _isSavingStatus ? null : _saveStatus,
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFF4F46E5),
                                      foregroundColor: Colors.white,
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                      elevation: 0,
                                      padding: const EdgeInsets.symmetric(horizontal: 16),
                                    ),
                                    child: Text(_isSavingStatus ? 'Lưu…' : 'Cập nhật'),
                                  ),
                                )
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),

                      _buildSectionCard(
                        title: Trans.customerInfo,
                        child: Column(
                          children: [
                            _buildInfoRow(Trans.customerNameLabel, _resolveCustomerName(_detail)),
                            _buildInfoRow(Trans.customerEmailLabel, _resolveCustomerEmail(_detail)),
                            const Divider(height: 16, color: Color(0xFFF1F5F9)),
                            _buildInfoRow(Trans.receiverNameLabel, _resolveShippingName(_detail)),
                            _buildInfoRow(Trans.phone, _resolveShippingPhone(_detail)),
                            _buildInfoRow(Trans.shippingAddressLabel, _resolveShippingAddress(_detail)),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),

                      _buildSectionCard(
                        title: '${Trans.productList} (${items.length})',
                        child: Column(
                          children: items.map((item) {
                            final imgUrl = _getResolvedProductImage(item);
                            
                            return Padding(
                              padding: const EdgeInsets.symmetric(vertical: 8.0),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(8),
                                    child: Container(
                                      width: 56,
                                      height: 56,
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFF1F5F9),
                                        border: Border.all(color: const Color(0xFFE2E8F0)),
                                      ),
                                      child: imgUrl.isNotEmpty
                                          ? Image.network(
                                              imgUrl,
                                              fit: BoxFit.cover,
                                              errorBuilder: (context, error, stackTrace) {
                                                return const Icon(Icons.broken_image_rounded, color: Color(0xFF94A3B8), size: 20);
                                              },
                                            )
                                          : const Icon(Icons.image_rounded, color: Color(0xFF94A3B8), size: 20),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          item['name'] ?? Trans.noProductName, 
                                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Theme.of(context).colorScheme.onSurface), 
                                          maxLines: 2, 
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          'SL: ${item['quantity']}  ×  ${AdminOrdersService.formatVnd(item['unit_price'] ?? 0)}₫', 
                                          style: const TextStyle(color: Color(0xFF64748B), fontSize: 12, fontWeight: FontWeight.w500),
                                        ),
                                      ],
                                    ),
                                  ),
                                  // const SizedBox(width: 8),
                                  // Text(
                                  //   '${AdminOrdersService.formatVnd(item['total_price'] ?? 0)}₫', 
                                  //   style: TextStyle(fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface, fontSize: 13),
                                  // ),
                                ],
                              ),
                            );
                          }).toList(),
                        ),
                      ),
                      const SizedBox(height: 12),

                      _buildSectionCard(
                        title: Trans.paymentCost,
                        child: Column(
                          children: [
                            _buildAmountRow('Tạm tính', amounts['subtotal'] ?? 0),
                            _buildAmountRow('Phí vận chuyển', amounts['shipping_fee'] ?? 0),
                            _buildAmountRow('Mã giảm giá', amounts['discount'] ?? 0, isDiscount: true),
                            const Divider(height: 16, color: Color(0xFFF1F5F9)),
                            _buildAmountRow('Thành tiền', amounts['total'] ?? 0, isTotal: true),
                            const SizedBox(height: 6),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(Trans.paymentMethod, style: TextStyle(color: Theme.of(context).colorScheme.onSurface, fontSize: 13)),
                                Text(
                                  _resolvePaymentMethod(_detail), 
                                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Theme.of(context).colorScheme.onSurface),
                                ),
                              ],
                            )
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),

                      _buildReturnRequestSection(),
                      const SizedBox(height: 12),

                      _buildStatusHistorySection(),
                    ],
                  ),
                ),
    );
  }

  Widget _buildSectionCard({required String title, required Widget child, Widget? trailing}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface, 
        borderRadius: BorderRadius.circular(12), 
        border: Border.all(color: Theme.of(context).colorScheme.onSurface, width: 0.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start, 
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(title, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Theme.of(context).colorScheme.onSurface)),
              if (trailing != null) trailing,
            ],
          ),
          Padding(padding: EdgeInsets.symmetric(vertical: 6), child: Divider(height: 1, color: Theme.of(context).colorScheme.onSurface)),
          child
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 110, child: Text(label, style: TextStyle(color: Theme.of(context).colorScheme.onSurface, fontSize: 13))),
          Expanded(child: Text(value, style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Theme.of(context).colorScheme.onSurface))),
        ],
      ),
    );
  }

  Widget _buildAmountRow(String label, num val, {bool isDiscount = false, bool isTotal = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: isTotal ? 14 : 13, fontWeight: isTotal ? FontWeight.bold : FontWeight.normal, color: isTotal ? Theme.of(context).colorScheme.primary : Theme.of(context).colorScheme.onSurface)),
          Text(
            '${isDiscount ? "-" : ""}${AdminOrdersService.formatVnd(val)}₫',
            style: TextStyle(
              fontSize: isTotal ? 15 : 13,
              fontWeight: isTotal ? FontWeight.bold : FontWeight.w600,
              color: isDiscount ? Colors.red : (isTotal ? Color(0xFFFF2424) : Theme.of(context).colorScheme.onSurface),
            ),
          )
        ],
      ),
    );
  }
}