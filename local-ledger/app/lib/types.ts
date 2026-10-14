export type Grid = string[][]

export type AmountMapping =
  | { mode: 'single'; amount: number; flipSign: boolean }
  | { mode: 'split'; inflow: number; outflow: number }

/** 컬럼 값은 0부터 시작하는 열 인덱스, -1은 미선택. headerRow는 1부터 시작 */
export interface Mapping {
  headerRow: number
  date: number
  merchant: number
  amount: AmountMapping
}

export interface Transaction {
  date: string
  merchant: string
  /** 원 단위 정수. 수입 +, 지출 −. 값이 없으면 null */
  amount: number | null
}

export interface MappedResult {
  rows: Transaction[]
  total: number
  /** 금액이 비어 합계에서 빠진 행 수 */
  missingAmount: number
  /** 날짜를 인식하지 못해 제외된 행 수 (합계 행·안내 문구 등) */
  skipped: number
  /** 제외된 행 중 금액이 읽히는 마지막 행 = 파일 안 합계 행 후보. 없으면 null */
  sourceTotal: number | null
}

export interface Rule {
  id?: number
  /** 가맹점 문자열에 포함되면 매칭 (공백·대소문자 무시) */
  pattern: string
  category: string
}
