import 'dart:convert';
import 'package:http/http.dart' as http;

class NewsletterService {
  static const String _baseUrl = 'http://192.168.24.18:8000/api';

  static Future<Map<String, dynamic>> subscribeToNewsletter({
    required String email,
    String source = 'home',
  }) async {
    try {
      final response = await http
          .post(
            Uri.parse('$_baseUrl/newsletter/subscriptions'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'email': email,
              'source': source,
            }),
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 201 || response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception(
            'Failed to subscribe: ${response.statusCode} - ${response.body}');
      }
    } on http.ClientException catch (e) {
      throw Exception('Network error: ${e.message}');
    } catch (e) {
      throw Exception('Error subscribing to newsletter: $e');
    }
  }
}
