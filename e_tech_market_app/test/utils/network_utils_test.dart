import 'package:flutter_test/flutter_test.dart';
import 'package:e_tech_market_app/utils/network_utils.dart';

void main() {
  group('NetworkUtils', () {
    group('fixDeviceUrl', () {
      test('returns empty string for null input', () {
        expect(NetworkUtils.fixDeviceUrl(null), '');
      });

      test('returns empty string for empty input', () {
        expect(NetworkUtils.fixDeviceUrl(''), '');
      });

      test('adds base URL prefix for whitespace-only (trimmed to empty then built)', () {
        // Whitespace is trimmed, then base URL is prepended
        final result = NetworkUtils.fixDeviceUrl('   ');
        expect(result.isNotEmpty, true);
        expect(result.contains('://'), true);
      });
    });
  });
}