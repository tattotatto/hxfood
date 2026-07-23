import { isValidPhone, isValidUSCC, isPositiveInteger } from './validate';

describe('Validate Utils', () => {
  describe('isValidPhone', () => {
    it('accepts 13812345678', () => {
      expect(isValidPhone('13812345678')).toBe(true);
    });
    it('rejects phone starting with 2', () => {
      expect(isValidPhone('23812345678')).toBe(false);
    });
    it('rejects short phone', () => {
      expect(isValidPhone('1381234567')).toBe(false);
    });
  });

  describe('isValidUSCC', () => {
    it('accepts valid 18-char code', () => {
      expect(isValidUSCC('91310113MA1GL5N31X')).toBe(true);
    });
    it('rejects invalid char', () => {
      expect(isValidUSCC('91310113MA1GL5N31I')).toBe(false);
    });
  });

  describe('isPositiveInteger', () => {
    it('accepts 100', () => {
      expect(isPositiveInteger(100)).toBe(true);
    });
    it('rejects 0', () => {
      expect(isPositiveInteger(0)).toBe(false);
    });
    it('rejects -1', () => {
      expect(isPositiveInteger(-1)).toBe(false);
    });
  });
});
