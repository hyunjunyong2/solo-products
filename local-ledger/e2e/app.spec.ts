import { expect, test, type Locator, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import Papa from 'papaparse'
import expected from '../fixtures/expected.json' with { type: 'json' }

const ORIGIN = 'http://localhost:4173'
const won = (n: number) => n.toLocaleString('ko-KR')
let external: string[] = []

test.beforeEach(({ page }) => {
  external = []
  page.on('request', (req) => {
    const url = req.url()
    if (!url.startsWith(ORIGIN) && !url.startsWith('data:') && !url.startsWith('blob:')) external.push(url)
  })
})

test.afterEach(() => {
  expect(external, '외부 요청 0건').toEqual([])
})

async function upload(page: Page, file: string) {
  await page.locator('input[type=file]').setInputFiles(`fixtures/${file}`)
}

async function mapSingle(page: Page, headerRow: number, date: string, merchant: string, amount: string) {
  await page.getByLabel('헤더 행').fill(String(headerRow))
  await page.getByLabel('날짜', { exact: true }).selectOption({ label: date })
  await page.getByLabel('가맹점', { exact: true }).selectOption({ label: merchant })
  await page.getByLabel('금액', { exact: true }).selectOption({ label: amount })
  await page.getByLabel('부호 반전').check()
}

async function expectTable(page: Page, file: keyof typeof expected) {
  const exp = expected[file]
  await expect(page.locator('tbody tr')).toHaveCount(exp.rows)
  await expect(page.getByTestId('total')).toHaveText(won(exp.total))
  const body = await page.locator('tbody').innerText()
  for (const m of exp.merchants) expect(body).toContain(m)
  expect(body).not.toContain('�')
}

test('EUC-KR CSV', async ({ page }) => {
  await page.goto('/')
  await upload(page, 'card-euckr.csv')
  await expect(page.getByTestId('file-info')).toContainText('euc-kr')
  await mapSingle(page, 2, '1열: 이용일자', '2열: 가맹점명', '3열: 이용금액')
  await expectTable(page, 'card-euckr.csv')
  await expect(page.getByText('날짜 인식 불가 1행 제외')).toBeVisible()
})

test('UTF-8 CSV (입금/출금 분리)', async ({ page }) => {
  await page.goto('/')
  await upload(page, 'bank-utf8.csv')
  await expect(page.getByTestId('file-info')).toContainText('utf-8')
  await page.getByLabel('날짜', { exact: true }).selectOption({ label: '1열: 거래일시' })
  await page.getByLabel('가맹점', { exact: true }).selectOption({ label: '2열: 적요' })
  await page.getByLabel('금액 형식').selectOption('split')
  await page.getByLabel('입금', { exact: true }).selectOption({ label: '3열: 입금' })
  await page.getByLabel('출금', { exact: true }).selectOption({ label: '4열: 출금' })
  await expectTable(page, 'bank-utf8.csv')
  await expect(page.getByText('금액 없음 1행(합계 제외)')).toBeVisible()
})

test('xlsx + 매핑 저장 후 새로고침 복원', async ({ page }) => {
  await page.goto('/')
  await upload(page, 'card.xlsx')
  await mapSingle(page, 1, '1열: 승인일', '2열: 가맹점', '3열: 금액')
  await expectTable(page, 'card.xlsx')
  await expect(page.locator('tbody tr').first()).toContainText('2026-10-01')

  await page.getByLabel('프로필 이름').fill('가짜카드 xlsx')
  await page.getByRole('button', { name: '매핑 저장' }).click()
  await expect(page.getByTestId('message')).toHaveText('프로필 "가짜카드 xlsx" 저장됨')

  await page.reload()
  await upload(page, 'card.xlsx')
  await expect(page.getByTestId('message')).toHaveText('프로필 "가짜카드 xlsx" 자동 적용')
  await expectTable(page, 'card.xlsx')
})

async function loadCardCsv(page: Page) {
  await page.goto('/')
  await upload(page, 'card-euckr.csv')
  await mapSingle(page, 2, '1열: 이용일자', '2열: 가맹점명', '3열: 이용금액')
}

async function classifyIn(page: Page, label: string, category: string) {
  await page.getByLabel(label, { exact: true }).fill(category)
  await page.getByLabel(label, { exact: true }).press('Enter')
}

const groups = (page: Page) => page.getByTestId('unclassified-group')
const nav = (page: Page, name: RegExp) => page.getByRole('button', { name })

test('미분류 큐 분류 → 규칙 저장, 새로고침 후 유지, 거래 데이터는 저장 안 함', async ({ page }) => {
  await loadCardCsv(page)
  await nav(page, /^미분류/).click()
  await expect(groups(page)).toHaveCount(8)

  await classifyIn(page, '테스트카페 분류', '카페')
  await expect(groups(page)).toHaveCount(7)

  await nav(page, /^내역 가져오기/).click()
  const cafeInputs = page.locator('tbody tr', { hasText: '테스트카페' }).getByRole('combobox')
  expect(await cafeInputs.count()).toBeGreaterThan(0)
  for (const input of await cafeInputs.all()) await expect(input).toHaveValue('카페')

  await page.reload()
  await loadCardCsv(page)
  await expect(page.locator('tbody tr', { hasText: '테스트카페' }).first().getByRole('combobox')).toHaveValue('카페')
  await expect(nav(page, /^미분류/)).toHaveText(/7/)

  const dump = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('local-ledger')
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    const rules = await new Promise<object[]>((resolve) => {
      const req = db.transaction('rules').objectStore('rules').getAll()
      req.onsuccess = () => resolve(req.result)
    })
    db.close()
    return { stores: [...db.objectStoreNames], keys: [...new Set(rules.flatMap(Object.keys))].sort() }
  })
  expect(dump).toEqual({ stores: ['profiles', 'rules'], keys: ['category', 'id', 'pattern'] })
})

test('규칙 pattern을 줄이면 넓게 매칭, 더 긴 규칙이 우선', async ({ page }) => {
  await loadCardCsv(page)
  await nav(page, /^미분류/).click()
  await classifyIn(page, '테스트카페 분류', '카페')

  await nav(page, /^분류 규칙/).click()
  await classifyIn(page, '테스트카페 패턴', '테스트')

  await nav(page, /^미분류/).click()
  await expect(groups(page)).toHaveCount(6)
  await expect(page.getByLabel('똠양꿍 테스트점 분류')).toHaveCount(0)

  await nav(page, /^내역 가져오기/).click()
  const ttam = page.locator('tbody tr', { hasText: '똠양꿍 테스트점' }).first().getByRole('combobox')
  await expect(ttam).toHaveValue('카페')
  await ttam.fill('식비')
  await ttam.press('Enter')
  await expect(page.locator('tbody tr', { hasText: '테스트카페' }).first().getByRole('combobox')).toHaveValue('카페')

  await nav(page, /^분류 규칙/).click()
  await expect(page.getByLabel('똠양꿍 테스트점 분류', { exact: true })).toHaveValue('식비')
  await expect(page.getByLabel('테스트 분류', { exact: true })).toHaveValue('카페')
})

test('규칙 JSON 내보내기 → 삭제 → 가져오기', async ({ page }) => {
  await loadCardCsv(page)
  await nav(page, /^미분류/).click()
  await classifyIn(page, '테스트카페 분류', '카페')
  await classifyIn(page, '샘플마트 분류', '생활')

  await nav(page, /^분류 규칙/).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'JSON 내보내기' }).click(),
  ])
  const file = await download.path()
  expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual({
    version: 1,
    rules: [
      { pattern: '테스트카페', category: '카페' },
      { pattern: '샘플마트', category: '생활' },
    ],
  })

  await page.getByRole('button', { name: '테스트카페 삭제' }).click()
  await page.getByRole('button', { name: '샘플마트 삭제' }).click()
  await expect(page.getByText('규칙이 없습니다')).toBeVisible()
  await expect(nav(page, /^미분류/)).toHaveText(/8/)

  await page.getByLabel('JSON 가져오기').setInputFiles(file)
  await expect(page.getByTestId('rules-message')).toHaveText('가져오기 완료: 추가 2 · 갱신 0 · 무시 0')
  await expect(nav(page, /^미분류/)).toHaveText(/6/)
})

const cells = (row: Locator) => row.locator('td')

test('월별 요약: 카드 CSV 원본 합계 일치·불일치, CSV 내보내기', async ({ page }) => {
  const exp = expected['card-euckr.csv']
  await loadCardCsv(page)
  await nav(page, /^미분류/).click()
  await classifyIn(page, '테스트카페 분류', '카페')

  await nav(page, /^월별 요약/).click()
  await expect(page.getByTestId('month-row')).toHaveCount(1)
  await expect(cells(page.getByTestId('month-row'))).toHaveText(['2026-09', '20', /\d/, /-/, won(exp.total)])
  await expect(page.getByTestId('kpi-net')).toHaveText(won(exp.total))
  await expect(page.getByTestId('consistency-check')).toContainText('✅')
  await expect(page.getByTestId('source-check')).toContainText('✅ 원본 합계 일치')

  await page.getByLabel('명세서 총액').fill('300,000')
  await expect(page.getByTestId('source-check')).toHaveText(`❌ 원본 합계 불일치 · 차이 ${won(-exp.total - 300_000)}`)

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'CSV 내보내기' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('card-euckr-분류.csv')
  const text = readFileSync(await download.path(), 'utf8')
  expect(text.startsWith('﻿')).toBe(true)
  const { data } = Papa.parse<string[]>(text.slice(1), { skipEmptyLines: true })
  const [header, ...rows] = data
  expect(header).toEqual(['날짜', '가맹점', '금액', '분류'])
  expect(rows).toHaveLength(exp.rows)
  expect(rows.reduce((s, r) => s + Number(r[2]), 0)).toBe(exp.total)
  for (const r of rows) expect(r[3]).toBe(r[1] === '테스트카페' ? '카페' : '')
})

test('월별 요약: 2개월 CSV의 월별·분류별 합계, 원본 합계 없음 안내', async ({ page }) => {
  const csv = [
    '날짜,내용,금액',
    '2026-08-30,가짜급여,3000000',
    '2026-08-31,테스트카페,-4500',
    '2026-09-01,테스트카페,-5000',
    '2026-09-02,샘플마트,-20000',
    '2026-09-03,샘플마트 환불,1000',
  ].join('\n')
  await page.goto('/')
  await page.locator('input[type=file]').setInputFiles({ name: 'two-months.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) })
  await page.getByLabel('날짜', { exact: true }).selectOption({ label: '1열: 날짜' })
  await page.getByLabel('가맹점', { exact: true }).selectOption({ label: '2열: 내용' })
  await page.getByLabel('금액', { exact: true }).selectOption({ label: '3열: 금액' })

  await nav(page, /^미분류/).click()
  await classifyIn(page, '테스트카페 분류', '카페')
  await classifyIn(page, '가짜급여 분류', '급여')

  await nav(page, /^월별 요약/).click()
  const months = page.getByTestId('month-row')
  await expect(months).toHaveCount(2)
  await expect(cells(months.nth(0))).toHaveText(['2026-08', '2', '3,000,000', '-4,500', '2,995,500'])
  await expect(cells(months.nth(1))).toHaveText(['2026-09', '3', '1,000', '-25,000', '-24,000'])

  const cats = page.getByTestId('category-row')
  await expect(cats).toHaveCount(3)
  await expect(cells(cats.nth(0))).toHaveText(['카페', '-4,500', '-5,000', '-9,500'])
  await expect(cells(cats.nth(1))).toHaveText(['급여', '3,000,000', '-', '3,000,000'])
  await expect(cells(cats.nth(2))).toHaveText(['미분류', '-', '-19,000', '-19,000'])

  await expect(page.getByTestId('consistency-check')).toContainText('✅')
  await expect(page.getByTestId('source-check')).toHaveText('비교할 원본 합계가 없습니다. 명세서 총액을 입력하세요')
  await page.getByLabel('명세서 총액').fill('2971500')
  await expect(page.getByTestId('source-check')).toContainText('✅ 원본 합계 일치')
})
