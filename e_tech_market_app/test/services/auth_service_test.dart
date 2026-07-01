import 'package:flutter_test/flutter_test.dart';
import 'package:e_tech_market_app/services/auth_service.dart';

void main() {
  group('AuthService login response parsing', () {
    test('returns requires_2fa when backend asks for otp', () async {
      final result = await AuthService.parseLoginResponse({
        'requires_2fa': true,
        'message': '2FA authentication required.',
      });

      expect(result['requires_2fa'], isTrue);
      expect(result['message'], '2FA authentication required.');
    });
  });
}
