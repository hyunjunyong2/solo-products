import { describe, expect, it } from 'vitest'
import { isConsistent, summarize } from '../app/lib/summary'
import type { Transaction } from '../app/lib/types'

const rows: Transaction[] = [
  { date: '2026-08-30', merchant: '가짜급여', amount: 3_000_000 },
  { date: '2026-08-31', merchant: '테스트카페', amount: -4_500 },
  { date: '2026-09-01', merchant: '테스트카페', amount: -5_000 },
  { date: '2026-09-02', merchant: '샘플마트', amount: -20_000 },
  { date: '2026-09-03', merchant: '샘플마트 환불', amount: 1_000 },
  { date: '2026-09-04', merchant: '메모만 있는 행', amount: null },
]
const categories = ['급여', '카페', '카페', null, null, null]
const total = 3_000_000 - 4_500 - 5_000 - 20_000 + 1_000
const s = summarize(rows, categories)

describe('summarize', () => {
  it('월별 수입·지출·순액·건수 (금액 null은 건수만)', () => {
    expect(s.months).toEqual([
      { month: '2026-08', income: 3_000_000, expense: -4_500, net: 2_995_500, count: 2 },
      { month: '2026-09', income: 1_000, expense: -25_000, net: -24_000, count: 4 },
    ])
    expect(s.total).toEqual({ income: 3_001_000, expense: -29_500, net: total, count: 6 })
  })

  it('분류 × 월 합계, 지출 큰 순, 미분류는 맨 아래', () => {
    expect(s.categories).toEqual([
      { category: '카페', byMonth: { '2026-08': -4_500, '2026-09': -5_000 }, total: -9_500 },
      { category: '급여', byMonth: { '2026-08': 3_000_000 }, total: 3_000_000 },
      { category: null, byMonth: { '2026-09': -19_000 }, total: -19_000 },
    ])
  })

  it('빈 입력', () => {
    expect(summarize([], [])).toEqual({ months: [], categories: [], total: { income: 0, expense: 0, net: 0, count: 0 } })
  })
})

describe('isConsistent', () => {
  it('월별 합 = 분류별 합 = 거래표 합계, 건수 합 = 행 수', () => {
    expect(isConsistent(s, { rows, total })).toBe(true)
  })

  it('하나라도 어긋나면 false', () => {
    expect(isConsistent(s, { rows, total: total + 1 })).toBe(false)
    expect(isConsistent(s, { rows: rows.slice(1), total })).toBe(false)
    expect(isConsistent({ ...s, categories: s.categories.slice(1) }, { rows, total })).toBe(false)
  })
})
