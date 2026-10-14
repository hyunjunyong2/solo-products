import Dexie, { type EntityTable } from 'dexie'
import { mergeRules } from './rules'
import type { Mapping, Rule } from './types'

export interface Profile {
  id?: number
  name: string
  /** 저장 당시 헤더 행. 같은 헤더의 파일을 다시 열면 자동 적용한다 */
  headers: string[]
  mapping: Mapping
}

export const db = new Dexie('local-ledger') as Dexie & {
  profiles: EntityTable<Profile, 'id'>
  rules: EntityTable<Rule, 'id'>
}

db.version(1).stores({ profiles: '++id, &name' })
db.version(2).stores({ rules: '++id, &pattern' })

/** 같은 이름이 있으면 덮어쓴다 */
export async function saveProfile(p: Omit<Profile, 'id'>): Promise<void> {
  const plain: Omit<Profile, 'id'> = JSON.parse(JSON.stringify(p))
  const existing = await db.profiles.where('name').equals(p.name).first()
  await db.profiles.put(existing ? { ...plain, id: existing.id } : plain)
}

export function findProfileByHeaders(profiles: Profile[], grid: string[][]): Profile | undefined {
  return profiles.find((p) => JSON.stringify(grid[p.mapping.headerRow - 1]) === JSON.stringify(p.headers))
}

/** pattern은 유일하다. 다른 규칙과 pattern이 겹치면 그 규칙에 합친다 */
export async function saveRule(r: Rule): Promise<void> {
  const pattern = r.pattern.trim()
  const category = r.category.trim()
  await db.transaction('rw', db.rules, async () => {
    const same = await db.rules.where('pattern').equals(pattern).first()
    if (same && same.id !== r.id) {
      if (r.id != null) await db.rules.delete(r.id)
      await db.rules.put({ ...same, category })
    } else {
      await db.rules.put(r.id == null ? { pattern, category } : { id: r.id, pattern, category })
    }
  })
}

export async function deleteRule(id: number): Promise<void> {
  await db.rules.delete(id)
}

export async function importRules(incoming: Omit<Rule, 'id'>[]): Promise<{ added: number; updated: number }> {
  return db.transaction('rw', db.rules, async () => {
    const { put, added, updated } = mergeRules(await db.rules.toArray(), incoming)
    await db.rules.bulkPut(put)
    return { added, updated }
  })
}
