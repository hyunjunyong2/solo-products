import Papa from 'papaparse'
import type { Transaction } from './types'

/** 날짜, 가맹점, 금액, 분류. 엑셀에서 한글이 깨지지 않도록 UTF-8 BOM을 붙인다 */
export function toResultCsv(rows: Transaction[], categories: (string | null)[]): string {
  const data = rows.map((t, i) => [t.date, t.merchant, t.amount ?? '', categories[i] ?? ''])
  return '﻿' + Papa.unparse({ fields: ['날짜', '가맹점', '금액', '분류'], data }, { newline: '\r\n' })
}
