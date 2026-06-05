import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import 'auth_service.dart';

class ShippingMethod {
  final int id;
  final String name;
  final String? description;
  final double baseFee;
  final int? estimatedDaysMin;
  final int? estimatedDaysMax;
  final bool isActive;

  const ShippingMethod({
    required this.id,
    required this.name,
    this.description,
    required this.baseFee,
    this.estimatedDaysMin,
    this.estimatedDaysMax,
    required this.isActive,
  });

  String get etaLabel {
    if (estimatedDaysMin != null && estimatedDaysMax != null) {
      return '$estimatedDaysMin–$estimatedDaysMax ngày';
    }
    if (estimatedDaysMin != null) return '$estimatedDaysMin+ ngày';
    return '';
  }

  factory ShippingMethod.fromJson(Map<String, dynamic> json) {
    return ShippingMethod(
      id: (json['id'] as num).toInt(),
      name: json['name']?.toString() ?? '',
      description: json['description']?.toString(),
      baseFee: _toDouble(json['base_fee']),
      estimatedDaysMin: json['estimated_days_min'] != null
          ? (json['estimated_days_min'] as num).toInt()
          : null,
      estimatedDaysMax: json['estimated_days_max'] != null
          ? (json['estimated_days_max'] as num).toInt()
          : null,
      isActive: json['is_active'] == true || json['is_active'] == 1,
    );
  }
}

class ShippingZone {
  final int id;
  final String name;
  final String? eta;
  final double fee;
  final bool isActive;

  const ShippingZone({
    required this.id,
    required this.name,
    this.eta,
    required this.fee,
    required this.isActive,
  });

  factory ShippingZone.fromJson(Map<String, dynamic> json) {
    return ShippingZone(
      id: (json['id'] as num).toInt(),
      name: json['name']?.toString() ?? '',
      eta: json['eta']?.toString(),
      fee: _toDouble(json['fee']),
      isActive: json['is_active'] == true || json['is_active'] == 1,
    );
  }
}

class ShippingPolicy {
  final double freeShippingMin;
  final bool applyGlobal;

  const ShippingPolicy({
    required this.freeShippingMin,
    required this.applyGlobal,
  });

  factory ShippingPolicy.fromJson(Map<String, dynamic> json) {
    return ShippingPolicy(
      freeShippingMin: _toDouble(json['free_shipping_min']),
      applyGlobal: json['apply_global'] == true || json['apply_global'] == 1,
    );
  }
}

class PaymentAvailability {
  final bool cod;
  final bool vnpay;
  final bool momo;

  const PaymentAvailability({
    this.cod = true,
    this.vnpay = true,
    this.momo = true,
  });

  factory PaymentAvailability.fromJson(Map<String, dynamic> json) {
    return PaymentAvailability(
      cod: json['cod']?['enabled'] == true,
      vnpay: json['vnpay']?['enabled'] == true,
      momo: json['momo']?['enabled'] == true,
    );
  }

  bool isAvailable(String method) {
    switch (method) {
      case 'cod': return cod;
      case 'vnpay': return vnpay;
      case 'momo': return momo;
      default: return false;
    }
  }
}

class CheckoutService {
  static const String _defaultBaseUrl = 'http://192.168.24.14:8000/api';
  static const String _baseUrl =
      String.fromEnvironment('API_BASE_URL', defaultValue: _defaultBaseUrl);

  static Future<Map<String, dynamic>> fetchShippingConfig() async {
    final uri = Uri.parse('$_baseUrl/store/shipping');
    final response = await _get(uri);
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  static Future<PaymentAvailability> fetchPaymentConfig() async {
    final uri = Uri.parse('$_baseUrl/store/payments');
    try {
      final response = await _get(uri);
      return PaymentAvailability.fromJson(
          jsonDecode(response.body) as Map<String, dynamic>);
    } catch (_) {
      return const PaymentAvailability();
    }
  }

  static Future<Map<String, dynamic>> applyCoupon({
    required String code,
    required double orderAmount,
  }) async {
    final token = await AuthService.getToken();
    final uri = Uri.parse('$_baseUrl/coupons/apply');
    final response = await _post(uri, {
      'code': code,
      'order_amount': orderAmount,
    }, token: token);
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> createOrder({
    required String shippingName,
    required String shippingPhone,
    required String shippingAddress,
    required String? notes,
    required String? couponCode,
    required String paymentMethod,
    required List<Map<String, dynamic>> items,
    int? shippingMethodId,
    int? shippingZoneId,
  }) async {
    final token = await AuthService.getToken();
    if (token == null) throw Exception('Vui lòng đăng nhập để đặt hàng.');

    final uri = Uri.parse('$_baseUrl/orders/from-items');
    final response = await _post(uri, {
      'shipping_name': shippingName,
      'shipping_phone': shippingPhone,
      'shipping_address_line': shippingAddress,
      'shipping_province': null,
      'shipping_district': null,
      'shipping_ward': null,
      'notes': notes,
      'coupon_code': couponCode,
      'payment_method': paymentMethod,
      'items': items,
      'shipping_method_id': shippingMethodId,
      'shipping_zone_id': shippingZoneId,
    }, token: token);
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  static Future<void> cancelOrder(int orderId) async {
    final token = await AuthService.getToken();
    if (token == null) return;
    final uri = Uri.parse('$_baseUrl/orders/$orderId/cancel');
    await _post(uri, {'_method': 'PATCH'}, token: token);
  }

  static Future<String> createPaymentLink({
    required String paymentMethod,
    required int orderId,
  }) async {
    final token = await AuthService.getToken();
    if (token == null) throw Exception('Vui lòng đăng nhập.');

    final uri = Uri.parse('$_baseUrl/payments/$paymentMethod/$orderId/create');
    final body = paymentMethod == 'momo'
        ? {'request_type': 'payWithMethod'}
        : null;
    final response = await _post(uri, body ?? {}, token: token);
    final data = jsonDecode(response.body) as Map<String, dynamic>;
    return data['pay_url']?.toString() ?? '';
  }

  static Future<http.Response> _get(Uri uri) async {
    try {
      final response = await http
          .get(uri, headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          })
          .timeout(const Duration(seconds: 15));

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return response;
      }
      throw Exception('Lỗi ${response.statusCode}');
    } on TimeoutException {
      throw Exception('Không thể kết nối tới máy chủ.');
    } on SocketException {
      throw Exception('Lỗi mạng.');
    } on http.ClientException {
      throw Exception('Lỗi HTTP.');
    }
  }

  static Future<http.Response> _post(
    Uri uri,
    Map<String, dynamic> body, {
    String? token,
  }) async {
    try {
      final headers = <String, String>{
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };
      if (token != null) headers['Authorization'] = 'Bearer $token';

      final response = await http
          .post(uri, headers: headers, body: jsonEncode(body))
          .timeout(const Duration(seconds: 15));

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return response;
      }

      String message = 'Lỗi ${response.statusCode}';
      try {
        final decoded = jsonDecode(response.body) as Map<String, dynamic>;
        message = decoded['message']?.toString() ?? message;
      } catch (_) {}
      throw Exception(message);
    } on TimeoutException {
      throw Exception('Không thể kết nối tới máy chủ.');
    } on SocketException {
      throw Exception('Lỗi mạng.');
    } on http.ClientException {
      throw Exception('Lỗi HTTP.');
    }
  }
}

double _toDouble(dynamic value) {
  if (value is num) return value.toDouble();
  return double.tryParse(value?.toString().replaceAll(',', '') ?? '') ?? 0;
}
