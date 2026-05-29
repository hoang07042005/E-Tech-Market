import { describe, it, expect } from 'vitest';
import { formatMoneyVnd, buildAccountAddressLine, calculateEffectivePrice } from '../../utils/helpers';

describe('helpers', () => {
  describe('formatMoneyVnd', () => {
    it('formats numbers correctly', () => {
      expect(formatMoneyVnd(1000000)).toBe('1.000.000 đ');
      expect(formatMoneyVnd(0)).toBe('0 đ');
    });

    it('formats string numbers correctly', () => {
      expect(formatMoneyVnd('500000')).toBe('500.000 đ');
    });

    it('handles invalid inputs gracefully', () => {
      expect(formatMoneyVnd('abc')).toBe('abc đ');
      expect(formatMoneyVnd(null as any)).toBe('0 đ');
      expect(formatMoneyVnd(undefined as any)).toBe('0 đ');
    });
  });

  describe('buildAccountAddressLine', () => {
    it('joins available address parts with comma', () => {
      const address = buildAccountAddressLine({
        address_line: '123 Le Loi',
        ward: 'Phuong 1',
        district: 'Quan 1',
        province: 'TP.HCM',
      });
      expect(address).toBe('123 Le Loi, Phuong 1, Quan 1, TP.HCM');
    });

    it('filters out missing address parts', () => {
      const address = buildAccountAddressLine({
        address_line: '123 Le Loi',
        ward: null,
        district: '',
        province: 'TP.HCM',
      });
      expect(address).toBe('123 Le Loi, TP.HCM');
    });

    it('returns empty string if profile is empty or all parts missing', () => {
      expect(buildAccountAddressLine({})).toBe('');
      expect(buildAccountAddressLine(null as any)).toBe('');
    });
  });

  describe('calculateEffectivePrice', () => {
    it('returns original price if no discount', () => {
      expect(calculateEffectivePrice(1000)).toBe(1000);
      expect(calculateEffectivePrice(1000, null, null)).toBe(1000);
    });

    it('calculates fixed discount correctly', () => {
      expect(calculateEffectivePrice(1000, 'fixed', 200)).toBe(800);
    });

    it('calculates percentage discount correctly', () => {
      expect(calculateEffectivePrice(1000, 'percentage', 20)).toBe(800);
    });

    it('does not return negative price', () => {
      expect(calculateEffectivePrice(1000, 'fixed', 1500)).toBe(0);
      expect(calculateEffectivePrice(1000, 'percentage', 150)).toBe(0);
    });

    it('handles invalid inputs gracefully', () => {
      expect(calculateEffectivePrice('invalid', 'fixed', 100)).toBe(0);
      expect(calculateEffectivePrice(1000, 'fixed', 'invalid')).toBe(1000);
    });
  });
});
