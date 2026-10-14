import type { MappedResult, Transaction } from './types'

export interface Totals {
  income: number
  expense: number
  net: number
  count: number
}

export interface MonthRow extends Totals {
  /** YYYY-MM */
  month: string
}

export interface CategoryRow {
  /** null은 미분류 */
  category: string | null
  byMonth: Record<string, number>
  total: number
}

export interface Summary {
  months: MonthRow[]
  categories: CategoryRow[]
  total: Totals
}

const emptyTotals = (): Totals => ({ income: 0, expense: 0, net: 0, count: 0 })

function add(t: Totals, amount: number | null) {
  t.count++
  if (amount == null) return
  if (amount > 0) t.income += amount
  else t.expense += amount
  t.net += amount
}

/** 월별·분류별 합계. 금액이 null인 행은 건수만 센다. 분류는 지출 큰 순, 미분류는 맨 아래 */
export function summarize(rows: Transaction[], categories: (string | null)[]): Summary {
  const months = new Map<string, MonthRow>()
  const cats = new Map<string | null, CategoryRow>()
  const total = emptyTotals()
  rows.forEach((t, i) => {
    const month = t.date.slice(0, 7)
    const mr = months.get(month) ?? { month, ...emptyTotals() }
    add(mr, t.amount)
    months.set(month, mr)
    add(total, t.amount)

    const category = categories[i] ?? null
    const cr = cats.get(category) ?? { category, byMonth: {}, total: 0 }
    cr.byMonth[month] = (cr.byMonth[month] ?? 0) + (t.amount ?? 0)
    cr.total += t.amount ?? 0
    cats.set(category, cr)
  })
  return {
    months: [...months.values()].sort((a, b) => a.month.localeCompare(b.month)),
    categories: [...cats.values()].sort(
      (a, b) => Number(a.category == null) - Number(b.category == null) || a.total - b.total,
    ),
    total,
  }
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

/** 월별 순액 합 = 분류별 합 = 거래표 합계, 월별 건수 합 = 행 수 */
export function isConsistent(s: Summary, result: Pick<MappedResult, 'rows' | 'total'>): boolean {
  return (
    sum(s.months.map((m) => m.net)) === result.total &&
    sum(s.categories.map((c) => c.total)) === result.total &&
    sum(s.months.map((m) => m.count)) === result.rows.length
  )
}
