import 'package:dio/dio.dart';
import '../../config/dio_client.dart';

class ChatMessage {
  final String role; // 'user' or 'model'
  final String text;
  final List<Map<String, dynamic>>? products;
  final Map<String, dynamic>? order;
  final String? couponCode;
  final String? intent;
  final DateTime timestamp;

  ChatMessage({
    required this.role,
    required this.text,
    this.products,
    this.order,
    this.couponCode,
    this.intent,
    DateTime? timestamp,
  }) : timestamp = timestamp ?? DateTime.now();

  bool get isUser => role == 'user';
  bool get hasProducts => products != null && products!.isNotEmpty;
  bool get hasOrder => order != null;
  bool get hasCoupon => couponCode != null && couponCode!.isNotEmpty;
}

class ChatbotService {
  static Future<ChatMessage> sendMessage({
    required String message,
    List<Map<String, String>> history = const [],
  }) async {
    try {
      final response = await DioClient.instance.post(
        '/chatbot/message',
        data: {
          'message': message,
          'history': history,
        },
      );

      final data = response.data as Map<String, dynamic>;

      return ChatMessage(
        role: 'model',
        text: data['reply'] as String? ?? 'Xin lỗi, mình không thể trả lời lúc này.',
        products: (data['products'] as List<dynamic>?)
            ?.map((p) => Map<String, dynamic>.from(p as Map))
            .toList(),
        order: data['order'] as Map<String, dynamic>?,
        couponCode: data['coupon_code'] as String?,
        intent: data['intent'] as String?,
      );
    } on DioException catch (e) {
      final errorMsg = _extractErrorMessage(e);
      return ChatMessage(
        role: 'model',
        text: errorMsg,
      );
    } catch (e) {
      return ChatMessage(
        role: 'model',
        text: 'Đã xảy ra lỗi kết nối. Vui lòng thử lại sau.',
      );
    }
  }

  static String _extractErrorMessage(DioException e) {
    if (e.response?.data is Map) {
      final data = e.response!.data as Map<String, dynamic>;
      return data['message']?.toString() ?? 'Có lỗi xảy ra, vui lòng thử lại.';
    }
    if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout) {
      return 'Kết nối quá thời gian. Vui lòng thử lại.';
    }
    return 'Không thể kết nối đến server. Vui lòng kiểm tra mạng.';
  }
}
