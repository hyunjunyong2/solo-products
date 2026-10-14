/** "1,234" / "-1,234" / "1234원" → 정수. 빈 값·인식 불가 → null */
export function parseAmount(input: string): number | null {
  const s = input.replace(/[,\s원₩]/g, '')
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null
  return Math.round(Number(s))
}
