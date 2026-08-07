import 'dart:convert';
import 'package:dio/dio.dart';

void main() async {
  final dio = Dio();
  try {
    final res = await dio.post('http://localhost:8000/api/v1/auth/login', 
      data: {'email': 'admin@etech.com', 'password': '12345678'},
      options: Options(headers: {'X-Client-Platform': 'mobile', 'Accept': 'application/json'})
    );
    print('SUCCESS');
    
    // Mimic _parseAuthResponse
    final body = res.data;
    print("Body type: ${body.runtimeType}");
    
    dynamic data;
    if (body is Map) {
      data = Map<String, dynamic>.from(
        body.map((key, value) => MapEntry(key.toString(), value)),
      );
    }
    
    final parsed = data;
    final token = parsed['token'] as String?;
    
    final rawUser = parsed['user'];
    Map<String, dynamic>? user;
    if (rawUser is Map) {
      user = Map<String, dynamic>.from(
        rawUser.map((key, value) => MapEntry(key.toString(), value)),
      );
    }
    
    print('User type: ${user.runtimeType}');
    
    try {
      final str = jsonEncode(user);
      print("jsonEncode success!");
    } catch (e) {
      print("jsonEncode failed: $e");
    }
    
  } catch (e) {
    if (e is DioException) {
      print('FAILED: ${e.response?.statusCode}');
      print(e.response?.data);
    } else {
      print('OTHER ERROR: $e');
    }
  }
}
