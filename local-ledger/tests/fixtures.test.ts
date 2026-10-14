import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { mapRows } from '../app/lib/mapRows'
import { readTable } from '../app/lib/readTable'
import type { Mapping } from '../app/lib/types'
import expected from '../fixtures/expected.json'

const cases: { file: keyof typeof expected; encoding: string; mapping: Mapping }[] = [
  {
    file: 'card-euckr.csv',
    encoding: 'euc-kr',
    mapping: { headerRow: 2, date: 0, merchant: 1, amount: { mode: 'single', amount: 2, flipSign: true } },
  },
  {
    file: 'bank-utf8.csv',
    encoding: 'utf-8',
    mapping: { headerRow: 1, date: 0, merchant: 1, amount: { mode: 'split', inflow: 2, outflow: 3 } },
  },
  {
    file: 'card.xlsx',
    encoding: 'xlsx',
    mapping: { headerRow: 1, date: 0, merchant: 1, amount: { mode: 'single', amount: 2, flipSign: true } },
  },
]

function load(name: string) {
  const b = readFileSync(new URL(`../fixtures/${name}`, import.meta.url))
  return readTable(name, b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer)
}

describe.each(cases)('$file', ({ file, encoding, mapping }) => {
  const exp = expected[file]
  const table = load(file)
  const result = mapRows(table.grid, mapping)

  it('인코딩 판별', () => expect(table.encoding).toBe(encoding))

  // Node(ICU)의 euc-kr 디코더는 CP949 확장 글자(똠, 뷁)를 지원하지 않는다.
  // 브라우저는 WHATWG 표준대로 windows-949로 디코딩하므로 확장 글자는 e2e(Chromium)에서 검증한다.
  const nodeCanDecode = (m: string) => encoding !== 'euc-kr' || !/[똠뷁]/.test(m)

  it('한글 깨짐 없음', () => {
    const merchants = result.rows.map((r) => r.merchant)
    for (const m of exp.merchants.filter(nodeCanDecode)) expect(merchants).toContain(m)
    if (encoding !== 'euc-kr') expect(merchants.join('')).not.toContain('�')
  })

  it('날짜 정규화', () => {
    for (const r of result.rows) expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('원본 합계 = 표 합계', () => {
    expect(result.rows).toHaveLength(exp.rows)
    expect(result.total).toBe(exp.total)
  })

  it('파일 안 합계 행 감지 (카드 CSV만 합계 행이 있음)', () => {
    expect(result.sourceTotal).toBe(file === 'card-euckr.csv' ? exp.total : null)
  })
})
