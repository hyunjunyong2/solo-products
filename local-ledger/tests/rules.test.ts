import { describe, expect, it } from 'vitest'
import { classify, groupUnclassified, matchRule, mergeRules, parseRulesJson, toRulesJson } from '../app/lib/rules'
import type { Rule, Transaction } from '../app/lib/types'

const tx = (merchant: string, amount: number | null = -1000): Transaction => ({ date: '2026-09-01', merchant, amount })

describe('matchRule', () => {
  it('가맹점에 포함되면 매칭', () => {
    expect(matchRule('가짜편의점 역삼점', [{ id: 1, pattern: '편의점', category: '생활' }])?.category).toBe('생활')
  })

  it('공백·대소문자·유니코드 정규화 무시', () => {
    const rules: Rule[] = [{ id: 1, pattern: 'star bucks', category: '카페' }]
    expect(matchRule('STARBUCKS 강남', rules)?.category).toBe('카페')
    expect(matchRule('테스트카페'.normalize('NFD'), [{ id: 1, pattern: '테스트카페', category: '카페' }])).toBeDefined()
  })

  it('가장 긴 pattern 우선, 길이가 같으면 id가 큰 규칙', () => {
    const rules: Rule[] = [
      { id: 1, pattern: '편의점', category: '생활' },
      { id: 2, pattern: '가짜편의점', category: '식비' },
      { id: 3, pattern: '역삼점', category: '기타' },
      { id: 4, pattern: '가짜편의', category: '무시' },
    ]
    expect(matchRule('가짜편의점 역삼점', rules)?.category).toBe('식비')
    expect(matchRule('편의점 역삼점', rules)?.category).toBe('기타')
  })

  it('매칭 없음, 빈 pattern은 무시', () => {
    expect(matchRule('샘플마트', [{ id: 1, pattern: '편의점', category: '생활' }])).toBeUndefined()
    expect(matchRule('샘플마트', [{ id: 1, pattern: '  ', category: '생활' }])).toBeUndefined()
  })
})

describe('classify / groupUnclassified', () => {
  const rows = [tx('테스트카페', -4000), tx('샘플마트', -10000), tx('테스트카페', -5000), tx('모의약국', null), tx(''), tx('모의약국', -3000), tx('모의약국', -2000)]
  const categories = classify(rows, [{ id: 1, pattern: '카페', category: '카페' }])

  it('행마다 카테고리, 미분류는 null', () => {
    expect(categories).toEqual(['카페', null, '카페', null, null, null, null])
  })

  it('미분류를 가맹점별로 묶는다 (건수 많은 순, 금액 null은 합계 제외, 빈 가맹점 제외)', () => {
    expect(groupUnclassified(rows, categories)).toEqual([
      { merchant: '모의약국', count: 3, total: -5000 },
      { merchant: '샘플마트', count: 1, total: -10000 },
    ])
  })
})

describe('규칙 JSON', () => {
  it('내보내기 → 가져오기 왕복', () => {
    const rules: Rule[] = [{ id: 7, pattern: '테스트카페', category: '카페' }]
    expect(parseRulesJson(toRulesJson(rules))).toEqual({ rules: [{ pattern: '테스트카페', category: '카페' }], invalid: 0 })
  })

  it('잘못된 항목은 건너뛰고 개수를 센다', () => {
    const text = JSON.stringify({
      version: 1,
      rules: [{ pattern: ' 샘플 ', category: ' 생활 ' }, { pattern: '', category: '식비' }, { pattern: 3, category: '식비' }, null],
    })
    expect(parseRulesJson(text)).toEqual({ rules: [{ pattern: '샘플', category: '생활' }], invalid: 3 })
  })

  it.each([['not json'], ['null'], ['{"version":2,"rules":[]}'], ['{"version":1}']])('형식 오류는 throw: %s', (text) => {
    expect(() => parseRulesJson(text)).toThrow()
  })
})

describe('mergeRules', () => {
  const existing: Rule[] = [
    { id: 1, pattern: '테스트카페', category: '카페' },
    { id: 2, pattern: '샘플마트', category: '생활' },
  ]

  it('같은 pattern은 덮어쓰고 없으면 추가, 같은 값은 건너뜀', () => {
    const r = mergeRules(existing, [
      { pattern: '테스트카페', category: '카페' },
      { pattern: '샘플마트', category: '식비' },
      { pattern: '모의약국', category: '의료' },
    ])
    expect(r).toEqual({
      put: [
        { id: 2, pattern: '샘플마트', category: '식비' },
        { pattern: '모의약국', category: '의료' },
      ],
      added: 1,
      updated: 1,
    })
  })

  it('가져오는 파일 안의 중복 pattern은 마지막 값, 개수는 한 번만', () => {
    const r = mergeRules(existing, [
      { pattern: '모의약국', category: 'A' },
      { pattern: '모의약국', category: 'B' },
      { pattern: '샘플마트', category: 'C' },
      { pattern: '샘플마트', category: 'D' },
    ])
    expect(r.put).toEqual([
      { pattern: '모의약국', category: 'B' },
      { id: 2, pattern: '샘플마트', category: 'D' },
    ])
    expect([r.added, r.updated]).toEqual([1, 1])
  })
})
