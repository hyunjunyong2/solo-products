import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { decode, type Encoding } from './decode'
import type { Grid } from './types'

const pad = (n: number) => String(n).padStart(2, '0')

function cellText(cell: XLSX.CellObject | undefined): string {
  if (!cell || cell.v == null) return ''
  if (cell.t === 'n' && cell.z && XLSX.SSF.is_date(cell.z)) {
    const d = XLSX.SSF.parse_date_code(cell.v as number)
    return `${d.y}-${pad(d.m)}-${pad(d.d)}`
  }
  return String(cell.v)
}

function readXlsx(buf: ArrayBuffer): Grid {
  const wb = XLSX.read(buf, { type: 'array', cellNF: true })
  const ws = wb.Sheets[wb.SheetNames[0]!]
  if (!ws?.['!ref']) return []
  const range = XLSX.utils.decode_range(ws['!ref'])
  const grid: Grid = []
  for (let r = range.s.r; r <= range.e.r; r++) {
    const row: string[] = []
    for (let c = range.s.c; c <= range.e.c; c++) {
      row.push(cellText(ws[XLSX.utils.encode_cell({ r, c })]))
    }
    grid.push(row)
  }
  return grid
}

/** 파일 내용을 문자열 2차원 배열로 읽는다. 빈 행은 제외 */
export function readTable(name: string, buf: ArrayBuffer): { grid: Grid; encoding: Encoding | 'xlsx' } {
  if (/\.xlsx?$/i.test(name)) {
    return { grid: readXlsx(buf).filter((row) => row.some((v) => v.trim() !== '')), encoding: 'xlsx' }
  }
  const { text, encoding } = decode(buf)
  const { data } = Papa.parse<string[]>(text, { skipEmptyLines: 'greedy' })
  return { grid: data, encoding }
}
