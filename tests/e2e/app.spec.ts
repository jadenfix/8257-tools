import { expect, test } from '@playwright/test'

const pages = [
  ['/explore', /ERC-8257 tool explorer/],
  ['/debug', /Explain exactly why a wallet can or cannot call a tool/],
  ['/register', /Register any API as a gated ERC-8257 tool/],
  ['/docs', /One SDK for discovery/],
  ['/dashboard', /Gateway analytics for tool builders/],
] as const

test.describe('8257Kit browser flows', () => {
  for (const [path, heading] of pages) {
    test(`renders ${path}`, async ({ page }) => {
      await page.goto(path)
      await expect(page.getByRole('heading', { name: heading })).toBeVisible()
    })
  }

  test('debugger explains denial, grants access, and invokes', async ({ page }) => {
    await page.goto('/debug')

    await expect(page.getByTestId('access-verdict')).toContainText('Access false')
    await expect(page.getByText('Subscribe to Risk Pro for $49/month.')).toBeVisible()

    await page.getByRole('button', { name: /Passing wallet/ }).click()
    await expect(page.getByTestId('access-verdict')).toContainText('Access true')

    await page.getByRole('button', { name: /Invoke through gateway/ }).click()
    await expect(page.getByText('"status": "success"')).toBeVisible()
  })

  test('explorer search and creator validation stay interactive', async ({ page }) => {
    await page.goto('/explore')
    await page.getByLabel('Search tools').fill('abi')
    await expect(page.getByText('Contract ABI Fetcher')).toBeVisible()
    await expect(page.getByText('Wallet Risk Scanner')).toHaveCount(0)

    await page.goto('/register')
    await page.getByLabel('Invocation endpoint').fill('http://localhost:8787/invoke')
    await expect(page.getByText('Invocation URL must use HTTPS.')).toBeVisible()
  })

  test('layout does not overflow the viewport', async ({ page }) => {
    await page.goto('/dashboard')

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    expect(overflow).toBe(false)
  })
})
