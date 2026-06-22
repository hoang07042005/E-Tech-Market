import 'package:dio/dio.dart';
import '../../config/dio_client.dart';

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
  static Future<Map<String, dynamic>> fetchShippingConfig() async {
    final response = await DioClient.instance.get('/store/shipping');
    return response.data as Map<String, dynamic>;
  }

  static Future<PaymentAvailability> fetchPaymentConfig() async {
    try {
      final response = await DioClient.instance.get('/store/payments');
      return PaymentAvailability.fromJson(response.data as Map<String, dynamic>);
    } catch (_) {
      return const PaymentAvailability();
    }
  }

  static Future<Map<String, dynamic>> applyCoupon({
    required String code,
    required double orderAmount,
  }) async {
    try {
      final response = await DioClient.instance.post('/coupons/apply', data: {
        'code': code,
        'order_amount': orderAmount,
      });
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw Exception(_extractErrorMessage(e));
    }
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
    try {
      final response = await DioClient.instance.post('/orders/from-items', data: {
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
      });
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw Exception(_extractErrorMessage(e));
    }
  }

  static Future<void> cancelOrder(int orderId) async {
    try {
      await DioClient.instance.patch('/orders/$orderId/cancel');
    } catch (_) {}
  }

  static Future<String> createPaymentLink({
    required String paymentMethod,
    required int orderId,
  }) async {
    try {
      final body = paymentMethod == 'momo'
          ? {'request_type': 'payWithMethod', 'order_id': orderId}
          : {'order_id': orderId};
      final response = await DioClient.instance.post('/payments/$paymentMethod/create', data: body);
      final data = response.data as Map<String, dynamic>;
      return data['pay_url']?.toString() ?? '';
    } on DioException catch (e) {
      throw Exception(_extractErrorMessage(e));
    }
  }

  static String _extractErrorMessage(DioException e) {
    if (e.response?.data is Map) {
      final data = e.response!.data as Map<String, dynamic>;
      return data['message']?.toString() ?? 'Có lỗi xảy ra, vui lòng thử lại sau.';
    }
    return 'Có lỗi xảy ra, vui lòng thử lại sau.';
  }
}


double _toDouble(dynamic value) {
  if (value is num) return value.toDouble();
  return double.tryParse(value?.toString().replaceAll(',', '') ?? '') ?? 0;
}
