import type { Rule, Transaction } from './types'

export interface MerchantGroup {
  merchant: string
  count: number
  total: number
}

export const normalize = (s: string) => s.normalize('NFC').toLowerCase().replace(/\s+/g, '')

/** 가맹점에 포함되는 규칙 중 pattern이 가장 긴 것. 길이가 같으면 나중에 만든 규칙(id가 큰 것) */
export function matchRule(merchant: string, rules: Rule[]): Rule | undefined {
  const m = normalize(merchant)
  let best: Rule | undefined
  let bestLen = 0
  for (const r of rules) {
    const p = normalize(r.pattern)
    if (!p || !m.includes(p)) continue
    if (p.length > bestLen || (p.length === bestLen && (r.id ?? 0) > (best?.id ?? 0))) {
      best = r
      bestLen = p.length
    }
  }
  return best
}

/** 행마다 카테고리. 미분류는 null */
export function classify(rows: Transaction[], rules: Rule[]): (string | null)[] {
  const cache = new Map<string, string | null>()
  return rows.map((t) => {
    if (!cache.has(t.merchant)) cache.set(t.merchant, matchRule(t.merchant, rules)?.category ?? null)
    return cache.get(t.merchant)!
  })
}

/** 미분류 행을 가맹점별로 묶는다. 건수 많은 순. 가맹점이 빈 행은 규칙을 만들 수 없어 제외 */
export function groupUnclassified(rows: Transaction[], categories: (string | null)[]): MerchantGroup[] {
  const groups = new Map<string, MerchantGroup>()
  rows.forEach((t, i) => {
    if (categories[i] != null || !t.merchant) return
    const g = groups.get(t.merchant) ?? { merchant: t.merchant, count: 0, total: 0 }
    g.count++
    g.total += t.amount ?? 0
    groups.set(t.merchant, g)
  })
  return [...groups.values()].sort((a, b) => b.count - a.count || a.merchant.localeCompare(b.merchant, 'ko'))
}

export function toRulesJson(rules: Rule[]): string {
  return JSON.stringify({ version: 1, rules: rules.map(({ pattern, category }) => ({ pattern, category })) }, null, 2)
}

/** 형식이 틀린 파일은 throw. 항목 단위 오류는 건너뛰고 개수만 센다 */
export function parseRulesJson(text: string): { rules: Omit<Rule, 'id'>[]; invalid: number } {
  const data = JSON.parse(text) as { version?: unknown; rules?: unknown } | null
  if (data?.version !== 1 || !Array.isArray(data.rules)) throw new Error('규칙 파일 형식이 아닙니다')
  const rules: Omit<Rule, 'id'>[] = []
  let invalid = 0
  for (const item of data.rules as { pattern?: unknown; category?: unknown }[]) {
    const pattern = typeof item?.pattern === 'string' ? item.pattern.trim() : ''
    const category = typeof item?.category === 'string' ? item.category.trim() : ''
    if (pattern && category) rules.push({ pattern, category })
    else invalid++
  }
  return { rules, invalid }
}

/** 같은 pattern은 카테고리를 덮어쓰고 없으면 추가한다. put은 저장할 규칙 목록 */
export function mergeRules(existing: Rule[], incoming: Omit<Rule, 'id'>[]) {
  const byPattern = new Map(existing.map((r) => [r.pattern, r]))
  const put = new Map<string, Rule>()
  let added = 0
  let updated = 0
  for (const { pattern, category } of incoming) {
    const cur = put.get(pattern) ?? byPattern.get(pattern)
    if (cur?.category === category) continue
    if (!put.has(pattern)) {
      if (cur) updated++
      else added++
    }
    put.set(pattern, cur ? { ...cur, category } : { pattern, category })
  }
  return { put: [...put.values()], added, updated }
}
