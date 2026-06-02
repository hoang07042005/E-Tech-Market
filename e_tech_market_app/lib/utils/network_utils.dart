String fixDeviceUrl(String? url) {
  if (url == null || url.isEmpty) return '';

  var fixedUrl = url;
  
  if (!fixedUrl.startsWith('http')) {
    const baseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'http://192.168.24.17:8000/api');
    final hostUrl = baseUrl.replaceAll(RegExp(r'/api/v1$|/api$'), '');
    
    if (!fixedUrl.startsWith('/')) {
      fixedUrl = '/$fixedUrl';
    }
    if (!fixedUrl.startsWith('/storage/')) {
      fixedUrl = '/storage$fixedUrl';
    }
    fixedUrl = '$hostUrl$fixedUrl';
  }

  fixedUrl = fixedUrl.replaceAll('localhost', '192.168.24.17');
  fixedUrl = fixedUrl.replaceAll('127.0.0.1', '192.168.24.17');
  return fixedUrl;
}
