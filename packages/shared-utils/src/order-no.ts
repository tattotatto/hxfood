export function generateOrderNo(date: Date, seq: number): string {
  const y = date.getFullYear().toString().substring(2);
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  const seqStr = seq.toString().padStart(6, '0');
  return `OR${y}${m}${d}${seqStr}`;
}
