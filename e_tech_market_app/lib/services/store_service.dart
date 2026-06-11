import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';

class StoreService {
  static const String _baseUrl = ApiConfig.apiBaseUrl;

  static Future<Map<String, dynamic>> fetchConfig() async {
    final uri = Uri.parse('$_baseUrl/store/config');
    try {
      final response = await http.get(uri).timeout(const Duration(seconds: 10));
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
    } catch (_) {}
    return {};
  }
}
