import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
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
