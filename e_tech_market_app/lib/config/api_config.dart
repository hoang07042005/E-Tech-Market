/// Central place to configure API base url.
///
/// Update `apiBaseUrl` here to change IP/host for the entire app.
class ApiConfig {
  // Dành cho thiết bị thật, hãy đảm bảo IP này trùng với IP mạng LAN của máy bạn
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://192.168.24.16:8000/api/v1', // IP cho máy thật
  );
}
