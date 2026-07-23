export function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone);
}

export function isValidUSCC(code: string): boolean {
  return /^[0-9A-HJ-NPQRTUWXY]{2}\d{6}[0-9A-HJ-NPQRTUWXY]{10}$/.test(code);
}

export function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}
