import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;
import '../config/api_config.dart';

class FlashSaleService {
  static const String _baseUrl = ApiConfig.apiBaseUrl;

  static Future<Map<String, dynamic>?> fetchCurrentFlashSale() async {
    final uri = Uri.parse('$_baseUrl/flash-sale/current');

    try {
      final response = await http.get(uri, headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }).timeout(const Duration(seconds: 15));

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final data = jsonDecode(response.body);
        if (data is Map<String, dynamic>) {
          return data;
        }
        return null;
      }

      return null;
    } catch (e) {
      return null;
    }
  }
}