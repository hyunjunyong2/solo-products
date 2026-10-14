// 가짜 거래 내역 픽스처 생성. 실제 데이터 아님. 실행: pnpm fixtures
import { writeFileSync } from 'node:fs'
import iconv from 'iconv-lite'
import * as XLSX from 'xlsx'

const OUT = new URL('../fixtures/', import.meta.url)

let seed = 42
const rand = (n: number) => {
  seed = (seed * 1103515245 + 12345) % 2 ** 31
  return seed % n
}
const pad = (n: number) => String(n).padStart(2, '0')
const fmt = (n: number) => n.toLocaleString('en-US')

// CP949 확장 글자(똠, 뷁)와 기호(㈜) 포함
const MERCHANTS = ['가짜편의점 역삼점', '테스트카페', '샘플마트', '똠양꿍 테스트점', '㈜가짜상사', '뷁식당', '예시주유소', '모의약국']

const csv = (rows: string[][]) => rows.map((r) => r.map((v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(',')).join('\r\n') + '\r\n'

// 1) 카드 명세서: EUC-KR(CP949), 안내 문구 + 헤더 2행, 양수=지출, 맨 아래 합계 행
function card() {
  const rows: string[][] = [['가짜 카드 이용내역 (테스트용)', '', '', ''], ['이용일자', '가맹점명', '이용금액', '비고']]
  let sum = 0
  for (let i = 0; i < 20; i++) {
    const amount = (rand(300) + 10) * 100
    const cancel = i === 7
    const value = cancel ? -amount : amount
    sum += value
    const text = cancel ? `-${fmt(amount)}` : i === 3 ? `${amount}원` : fmt(amount)
    rows.push([`2026.09.${pad(1 + i)}`, MERCHANTS[i % MERCHANTS.length]!, text, cancel ? '취소' : ''])
  }
  rows.push(['합계', '', fmt(sum), ''])
  writeFileSync(new URL('card-euckr.csv', OUT), iconv.encode(csv(rows), 'cp949'))
  return { rows: 20, total: -sum, merchants: MERCHANTS }
}

// 2) 은행 거래내역: UTF-8 BOM, 입금/출금 분리, 금액 없는 행 1개
function bank() {
  const rows: string[][] = [['거래일시', '적요', '입금', '출금', '잔액']]
  let total = 0
  let balance = 1_000_000
  for (let i = 0; i < 15; i++) {
    const date = `2026-09-${pad(1 + i * 2)} ${pad(9 + (i % 9))}:${pad(rand(60))}:00`
    const merchant = i % 4 === 0 ? '가짜급여 입금' : MERCHANTS[i % MERCHANTS.length]!
    if (i === 5) {
      rows.push([date, '메모만 있는 행', '', '', fmt(balance)])
      continue
    }
    const amount = (rand(500) + 1) * 100
    const inflow = i % 4 === 0
    balance += inflow ? amount : -amount
    total += inflow ? amount : -amount
    rows.push([date, merchant, inflow ? fmt(amount) : '', inflow ? '' : fmt(amount), fmt(balance)])
  }
  writeFileSync(new URL('bank-utf8.csv', OUT), '﻿' + csv(rows))
  return { rows: 15, total, merchants: ['가짜급여 입금', '메모만 있는 행'] }
}

// 3) xlsx: 날짜 셀은 실제 엑셀 날짜, 금액은 숫자, 양수=지출
function xlsx() {
  const serial = (y: number, m: number, d: number) => (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86_400_000
  const ws: XLSX.WorkSheet = {}
  const header = ['승인일', '가맹점', '금액']
  header.forEach((h, c) => (ws[XLSX.utils.encode_cell({ r: 0, c })] = { t: 's', v: h }))
  let sum = 0
  const n = 12
  for (let i = 0; i < n; i++) {
    const amount = (rand(400) + 5) * 100
    sum += amount
    const r = i + 1
    ws[XLSX.utils.encode_cell({ r, c: 0 })] = { t: 'n', v: serial(2026, 10, 1 + i), z: 'yyyy-mm-dd' }
    ws[XLSX.utils.encode_cell({ r, c: 1 })] = { t: 's', v: MERCHANTS[(i + 3) % MERCHANTS.length]! }
    ws[XLSX.utils.encode_cell({ r, c: 2 })] = { t: 'n', v: amount }
  }
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: n, c: 2 } })
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '이용내역')
  writeFileSync(new URL('card.xlsx', OUT), XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
  return { rows: n, total: -sum, merchants: MERCHANTS }
}

const expected = { 'card-euckr.csv': card(), 'bank-utf8.csv': bank(), 'card.xlsx': xlsx() }
writeFileSync(new URL('expected.json', OUT), JSON.stringify(expected, null, 2) + '\n')
console.log(expected)
