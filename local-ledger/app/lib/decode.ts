export type Encoding = 'utf-8' | 'euc-kr'

/** UTF-8로 엄격하게 디코딩해 보고, 실패하면 EUC-KR(CP949)로 디코딩한다. BOM은 제거된다 */
export function decode(buf: ArrayBuffer): { text: string; encoding: Encoding } {
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(buf), encoding: 'utf-8' }
  } catch {
    return { text: new TextDecoder('euc-kr').decode(buf), encoding: 'euc-kr' }
  }
}
