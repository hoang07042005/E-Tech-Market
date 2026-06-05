import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class AdminOrdersService {
  static const String _baseUrl = 'http://192.168.24.14:8000/api';

  static Future<String?> _getAuthToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('auth_token');
  }

  static Future<Map<String, dynamic>> fetchAdminOrders({
    int page = 1,
    int perPage = 10,
    String? orderCode,
    String? customer,
    String? dateFrom,
    String? dateTo,
    String? status,
    String? paymentMethod,
    String? paymentStatus,
    String? returnRequests,
  }) async {
    final token = await _getAuthToken();
    if (token == null) throw Exception('Chưa đăng nhập');

    final Map<String, String> params = {
      'page': page.toString(),
      'per_page': perPage.toString(),
    };

    if (orderCode?.isNotEmpty ?? false) params['order_code'] = orderCode!;
    if (customer?.isNotEmpty ?? false) params['customer'] = customer!;
    if (dateFrom?.isNotEmpty ?? false) params['date_from'] = dateFrom!;
    if (dateTo?.isNotEmpty ?? false) params['date_to'] = dateTo!;
    if (status != null && status != 'all') params['status'] = status;
    if (paymentMethod != null && paymentMethod != 'all') params['payment_method'] = paymentMethod;
    if (paymentStatus != null && paymentStatus != 'all') params['payment_status'] = paymentStatus;
    if (returnRequests?.isNotEmpty ?? false) params['return_requests'] = returnRequests!;

    final uri = Uri.parse('$_baseUrl/admin/orders').replace(queryParameters: params);

    final response = await http.get(
      uri,
      headers: {'Authorization': 'Bearer $token', 'Accept': 'application/json'},
    );

    if (response.statusCode != 200) {
      throw Exception('Lỗi tải đơn hàng: ${response.statusCode}');
    }

    return jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> fetchAdminOrderDetail(int orderId) async {
    final token = await _getAuthToken();
    if (token == null) throw Exception('Chưa đăng nhập');

    final response = await http.get(
      Uri.parse('$_baseUrl/admin/orders/$orderId'),
      headers: {'Authorization': 'Bearer $token', 'Accept': 'application/json'},
    );

    if (response.statusCode != 200) {
      throw Exception('Lỗi tải chi tiết đơn: ${response.statusCode}');
    }

    return jsonDecode(response.body)['data'] ?? jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> updateAdminOrder(
    int orderId, {
    required String status,
  }) async {
    final token = await _getAuthToken();
    if (token == null) throw Exception('Chưa đăng nhập');

    final response = await http.post(
      Uri.parse('$_baseUrl/admin/orders/$orderId'),
      headers: {
        'Authorization': 'Bearer $token',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'status': status}),
    );

    if (response.statusCode != 200) {
      throw Exception('Lỗi cập nhật trạng thái: ${response.statusCode}');
    }

    return jsonDecode(response.body)['data'] ?? jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> processOrderReturn(
    int orderId,
    String action, {
    String? adminNote,
    List<String>? refundProofPaths,
  }) async {
    final token = await _getAuthToken();
    if (token == null) throw Exception('Chưa đăng nhập');

    final request = http.MultipartRequest(
      'POST',
      Uri.parse('$_baseUrl/admin/orders/$orderId/return-request'),
    );

    request.headers['Authorization'] = 'Bearer $token';
    request.fields['action'] = action;
    if (adminNote != null && adminNote.isNotEmpty) {
      request.fields['admin_note'] = adminNote;
    }

    if (refundProofPaths != null && refundProofPaths.isNotEmpty) {
      for (final path in refundProofPaths) {
        request.files.add(await http.MultipartFile.fromPath('refund_proof[]', path));
      }
    }

    final response = await request.send();

    if (response.statusCode != 200) {
      throw Exception('Lỗi xử lý hoàn trả: ${response.statusCode}');
    }

    final responseStr = await response.stream.bytesToString();
    return jsonDecode(responseStr)['data'] ?? jsonDecode(responseStr);
  }

  static String resolveImageUrl(String? url) {
    if (url == null || url.isEmpty) return '';
    if (url.startsWith('http')) return url;
    return '$_baseUrl${url.startsWith('/') ? url : '/$url'}';
  }

  static String formatVnd(num amount) {
    return amount.toStringAsFixed(0).replaceAllMapped(
          RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
          (Match m) => '${m[1]}.',
        );
  }

  static String formatViTime(String? isoString) {
    if (isoString == null || isoString.isEmpty) return '—';
    try {
      final dt = DateTime.parse(isoString);
      return '${dt.day}/${dt.month}/${dt.year} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (e) {
      return '—';
    }
  }

  static String formatDate(String? isoString) {
    if (isoString == null || isoString.isEmpty) return '—';
    try {
      final dt = DateTime.parse(isoString);
      return '${dt.day}/${dt.month}/${dt.year}';
    } catch (e) {
      return '—';
    }
  }
}
