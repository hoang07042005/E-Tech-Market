class NetworkUtils {
  static String fixDeviceUrl(String? url) {
    if (url == null || url.isEmpty) return '';

    var fixedUrl = url.trim();
    
    // If already a full URL, just replace localhost/127.0.0.1
    if (fixedUrl.startsWith('http://') || fixedUrl.startsWith('https://')) {
      fixedUrl = fixedUrl.replaceAll('localhost', '192.168.24.17');
      fixedUrl = fixedUrl.replaceAll('127.0.0.1', '192.168.24.17');
      return fixedUrl;
    }
    
    // For relative paths, append to base URL host (same as web's new URL logic)
    const baseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'http://192.168.24.17:8000/api');
    final hostUrl = baseUrl.replaceAll(RegExp(r'/api.*'), '');
    
    // Ensure path starts with /
    if (!fixedUrl.startsWith('/')) {
      fixedUrl = '/$fixedUrl';
    }
    
    fixedUrl = '$hostUrl$fixedUrl';
    fixedUrl = fixedUrl.replaceAll('localhost', '192.168.24.17');
    fixedUrl = fixedUrl.replaceAll('127.0.0.1', '192.168.24.17');
    return fixedUrl;
  }
}
