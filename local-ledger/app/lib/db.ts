import Dexie, { type EntityTable } from 'dexie'
import type { Mapping } from './types'

export interface Profile {
  id?: number
  name: string
  /** 저장 당시 헤더 행. 같은 헤더의 파일을 다시 열면 자동 적용한다 */
  headers: string[]
  mapping: Mapping
}

export const db = new Dexie('local-ledger') as Dexie & { profiles: EntityTable<Profile, 'id'> }

db.version(1).stores({ profiles: '++id, &name' })

/** 같은 이름이 있으면 덮어쓴다 */
export async function saveProfile(p: Omit<Profile, 'id'>): Promise<void> {
  const plain: Omit<Profile, 'id'> = JSON.parse(JSON.stringify(p))
  const existing = await db.profiles.where('name').equals(p.name).first()
  await db.profiles.put(existing ? { ...plain, id: existing.id } : plain)
}

export function findProfileByHeaders(profiles: Profile[], grid: string[][]): Profile | undefined {
  return profiles.find((p) => JSON.stringify(grid[p.mapping.headerRow - 1]) === JSON.stringify(p.headers))
}
