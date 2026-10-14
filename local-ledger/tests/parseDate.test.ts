import { describe, expect, it } from 'vitest'
import { parseDate } from '../app/lib/parseDate'

describe('parseDate', () => {
  it.each([
    ['2026.09.01', '2026-09-01'],
    ['2026-9-1', '2026-09-01'],
    ['2026/10/14 09:12:00', '2026-10-14'],
    ['20261014', '2026-10-14'],
    ['26.10.14', '2026-10-14'],
    ['합계', null],
    ['', null],
    ['2026.13.01', null],
  ])('%j → %j', (input, expected) => {
    expect(parseDate(input)).toBe(expected)
  })
})
