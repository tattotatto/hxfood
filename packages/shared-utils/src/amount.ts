/** 元转分: 12.34 → 1234 */
export function yuanToFen(yuan: number): number {
  return Math.round(yuan * 100);
}

/** 分转元: 1234 → 12.34 */
export function fenToYuan(fen: number): number {
  return fen / 100;
}

/** 分转展示字符串: 1234 → "12.34" */
export function formatFen(fen: number): string {
  return (fen / 100).toFixed(2);
}

/** 分转展示字符串（带¥符号） */
export function formatMoney(fen: number): string {
  return `¥${formatFen(fen)}`;
}

/** 安全乘法: 单价(分) × 数量 = 金额(分)，整数运算避免浮点 */
export function multiplyPrice(unitPriceFen: number, quantity: number): number {
  const scale = 1000;
  const qtyScaled = Math.round(quantity * scale);
  return Math.round((unitPriceFen * qtyScaled) / scale);
}
