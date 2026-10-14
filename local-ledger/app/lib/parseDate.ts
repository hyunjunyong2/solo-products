const pad = (n: number) => String(n).padStart(2, '0')

/** 2026.10.14 / 2026-10-14 / 2026/10/14 / 20261014 / 26.10.14 (뒤에 시각 허용) → YYYY-MM-DD. 인식 불가 → null */
export function parseDate(input: string): string | null {
  const s = input.trim()
  const m =
    s.match(/^(\d{4})[.\-/]\s*(\d{1,2})[.\-/]\s*(\d{1,2})(?!\d)/) ??
    s.match(/^(\d{4})(\d{2})(\d{2})(?!\d)/) ??
    s.match(/^(\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})(?!\d)/)
  if (!m) return null
  const y = m[1]!.length === 2 ? 2000 + Number(m[1]) : Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
  return `${y}-${pad(mo)}-${pad(d)}`
}
