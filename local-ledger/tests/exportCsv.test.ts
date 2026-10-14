import Papa from 'papaparse'
import { describe, expect, it } from 'vitest'
import { toResultCsv } from '../app/lib/exportCsv'
import type { Transaction } from '../app/lib/types'

describe('toResultCsv', () => {
  const rows: Transaction[] = [
    { date: '2026-09-01', merchant: '테스트카페', amount: -4_500 },
    { date: '2026-09-02', merchant: '가짜, "따옴표" 상사', amount: 12_000 },
    { date: '2026-09-03', merchant: '메모만 있는 행', amount: null },
  ]
  const csv = toResultCsv(rows, ['카페', null, null])

  it('UTF-8 BOM + 헤더 + CRLF', () => {
    expect(csv.startsWith('﻿날짜,가맹점,금액,분류\r\n')).toBe(true)
  })

  it('다시 읽으면 원래 값 (쉼표·따옴표 포함, null은 빈칸)', () => {
    const { data } = Papa.parse<string[]>(csv.slice(1), { skipEmptyLines: true })
    expect(data).toEqual([
      ['날짜', '가맹점', '금액', '분류'],
      ['2026-09-01', '테스트카페', '-4500', '카페'],
      ['2026-09-02', '가짜, "따옴표" 상사', '12000', ''],
      ['2026-09-03', '메모만 있는 행', '', ''],
    ])
  })
})
