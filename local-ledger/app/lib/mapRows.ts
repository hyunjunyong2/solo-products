import { parseAmount } from './parseAmount'
import { parseDate } from './parseDate'
import type { Grid, MappedResult, Mapping, Transaction } from './types'

function mappedColumns(m: Mapping): number[] {
  const amount = m.amount.mode === 'single' ? [m.amount.amount] : [m.amount.inflow, m.amount.outflow]
  return [m.date, m.merchant, ...amount]
}

/** 두 항목 이상에 선택된 열 (0부터) */
export function duplicateColumns(m: Mapping): number[] {
  const cols = mappedColumns(m).filter((c) => c >= 0)
  return [...new Set(cols.filter((c, i) => cols.indexOf(c) !== i))]
}

/** 모든 항목에 서로 다른 열이 선택됨 */
export function isMappingComplete(m: Mapping): boolean {
  return mappedColumns(m).every((c) => c >= 0) && duplicateColumns(m).length === 0
}

function rowAmount(row: string[], m: Mapping): number | null {
  const a = m.amount
  if (a.mode === 'single') {
    const v = parseAmount(row[a.amount] ?? '')
    return v == null ? null : a.flipSign ? -v : v
  }
  const inflow = parseAmount(row[a.inflow] ?? '')
  const outflow = parseAmount(row[a.outflow] ?? '')
  if (inflow == null && outflow == null) return null
  return (inflow ?? 0) - (outflow ?? 0)
}

/** 헤더 행 아래의 데이터를 거래로 변환한다. 날짜를 인식하지 못한 행은 제외하고 개수만 센다 */
export function mapRows(grid: Grid, m: Mapping): MappedResult {
  const rows: Transaction[] = []
  let total = 0
  let missingAmount = 0
  let skipped = 0
  let sourceTotal: number | null = null
  for (const row of grid.slice(m.headerRow)) {
    const date = parseDate(row[m.date] ?? '')
    if (!date) {
      skipped++
      sourceTotal = rowAmount(row, m) ?? sourceTotal
      continue
    }
    const amount = rowAmount(row, m)
    if (amount == null) missingAmount++
    else total += amount
    rows.push({ date, merchant: (row[m.merchant] ?? '').trim(), amount })
  }
  return { rows, total, missingAmount, skipped, sourceTotal }
}
