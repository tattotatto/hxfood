import { yuanToFen, fenToYuan, formatFen, multiplyPrice } from './amount';

describe('Amount Utils', () => {
  describe('yuanToFen', () => {
    it('12.34 → 1234', () => {
      expect(yuanToFen(12.34)).toBe(1234);
    });
    it('0.01 → 1', () => {
      expect(yuanToFen(0.01)).toBe(1);
    });
    it('0 → 0', () => {
      expect(yuanToFen(0)).toBe(0);
    });
    it('0.005 → 1 (round up)', () => {
      expect(yuanToFen(0.005)).toBe(1);
    });
  });

  describe('fenToYuan', () => {
    it('1234 → 12.34', () => {
      expect(fenToYuan(1234)).toBe(12.34);
    });
    it('1 → 0.01', () => {
      expect(fenToYuan(1)).toBe(0.01);
    });
  });

  describe('formatFen', () => {
    it('1234 → "12.34"', () => {
      expect(formatFen(1234)).toBe('12.34');
    });
    it('0 → "0.00"', () => {
      expect(formatFen(0)).toBe('0.00');
    });
  });

  describe('multiplyPrice', () => {
    it('1000分 × 3 = 3000分', () => {
      expect(multiplyPrice(1000, 3)).toBe(3000);
    });
    it('2500分 × 0.5 = 1250分', () => {
      expect(multiplyPrice(2500, 0.5)).toBe(1250);
    });
    it('1分 × 0.001 = 0分', () => {
      expect(multiplyPrice(1, 0.001)).toBe(0);
    });
  });
});
