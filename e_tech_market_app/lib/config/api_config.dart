class ApiConfig {
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://192.168.24.13:8000/api/v1', // IP cho máy thật
  );
}
