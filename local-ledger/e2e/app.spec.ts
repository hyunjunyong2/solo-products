import { expect, test, type Page } from '@playwright/test'
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
