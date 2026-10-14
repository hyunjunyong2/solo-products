import { describe, expect, it } from 'vitest'
import { parseAmount } from '../app/lib/parseAmount'

describe('parseAmount', () => {
  it.each([
    ['1,234', 1234],
    ['-1,234', -1234],
    ['1234원', 1234],
    ['', null],
    ['  ', null],
    ['abc', null],
  ])('%j → %j', (input, expected) => {
    expect(parseAmount(input)).toBe(expected)
  })
})
