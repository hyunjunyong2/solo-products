import { describe, expect, it } from 'vitest'
import { duplicateColumns, isMappingComplete } from '../app/lib/mapRows'
import type { Mapping } from '../app/lib/types'

const single = (date: number, merchant: number, amount: number): Mapping => ({
  headerRow: 1,
  date,
  merchant,
  amount: { mode: 'single', amount, flipSign: false },
})
const split = (date: number, merchant: number, inflow: number, outflow: number): Mapping => ({
  headerRow: 1,
  date,
  merchant,
  amount: { mode: 'split', inflow, outflow },
})

describe('duplicateColumns / isMappingComplete', () => {
  it('서로 다른 열 → 완성', () => {
    expect(duplicateColumns(single(0, 1, 2))).toEqual([])
    expect(isMappingComplete(single(0, 1, 2))).toBe(true)
    expect(isMappingComplete(split(0, 1, 2, 3))).toBe(true)
  })

  it('같은 열을 여러 항목에 선택 → 겹친 열 반환, 미완성', () => {
    expect(duplicateColumns(single(0, 0, 0))).toEqual([0])
    expect(isMappingComplete(single(0, 0, 0))).toBe(false)
    expect(duplicateColumns(split(0, 1, 2, 2))).toEqual([2])
    expect(duplicateColumns(split(0, 0, 3, 3))).toEqual([0, 3])
  })

  it('미선택(-1)은 겹침으로 보지 않음', () => {
    expect(duplicateColumns(single(0, -1, -1))).toEqual([])
    expect(isMappingComplete(single(0, -1, -1))).toBe(false)
  })
})
