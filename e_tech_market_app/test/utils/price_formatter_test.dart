import 'package:flutter_test/flutter_test.dart';
import 'package:intl/intl.dart';

void main() {
  // Test price formatting logic (can be extracted to utils later)
  group('Price Formatting', () {
    final format = NumberFormat.currency(locale: 'vi_VN', symbol: '₫');

    test('formats 1000 - contains 1.000 and ₫', () {
      expect(format.format(1000).contains('1.000'), true);
      expect(format.format(1000).contains('₫'), true);
    });

    test('formats 10000 - contains 10.000 and ₫', () {
      expect(format.format(10000).contains('10.000'), true);
      expect(format.format(10000).contains('₫'), true);
    });

    test('formats 100000 - contains 100.000 and ₫', () {
      expect(format.format(100000).contains('100.000'), true);
      expect(format.format(100000).contains('₫'), true);
    });

    test('formats 0 - contains 0 and ₫', () {
      expect(format.format(0).contains('0'), true);
      expect(format.format(0).contains('₫'), true);
    });

    test('formats 999 - contains 999 and ₫', () {
      expect(format.format(999).contains('999'), true);
      expect(format.format(999).contains('₫'), true);
    });
  });
}