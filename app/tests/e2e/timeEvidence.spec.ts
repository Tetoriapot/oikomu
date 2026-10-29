import { test, expect, chromium, useReferenceData } from './fixtures';
import { mkdir, writeFile } from 'node:fs/promises';

test('time explanation opens evidence, preserves search context and favorites', async ({ page }) => {
  await page.goto('/#/search?date=2026-11-07&place=station:st-tobitakyu&view=list');
  await page.getByRole('button', { name: '飛田給駅をお気に入りに登録' }).click();
  await page.locator('.time-windows').getByRole('link', { name: '時間帯の検証結果・参照リンク' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('検証・参照リンク');
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  await expect(page).toHaveURL(/sources\?date=2026-11-07&place=station%3Ast-tobitakyu&view=list/);
  await expect(page.locator('main')).toContainText('予測の的中率として扱いません');
  await expect(page.locator('main')).toContainText('50分後');
  await expect(page.locator('main')).toContainText('113分18秒');
  await page.reload();
  await page.getByRole('link', { name: '← 検索結果に戻る' }).click();
  await expect(page.locator('#search-date')).toHaveValue('2026-11-07');
  await expect(page.getByRole('button', { name: '飛田給駅をお気に入りから解除' })).toBeVisible();
});

test('reference list has safe URLs, limitations, all input times and existing official sources', async ({ page }) => {
  await page.goto('/#/sources');
  await page.getByRole('button', { name: '参照URL一覧へ' }).click();
  await expect(page.locator('#references-title')).toBeFocused();
  await expect(page.locator('.reference-card')).toHaveCount(8);
  for (const card of await page.locator('.reference-card').all()) {
    await expect(card).toContainText('対象：'); await expect(card).toContainText('限界：');
    for (const link of await card.locator('a').all()) {
      expect(await link.getAttribute('href')).toMatch(/^https:\/\//);
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      await expect(link).toHaveAttribute('target', '_blank');
    }
  }
  await page.getByText('2025-05-25の照合に使った全時刻', { exact: true }).click();
  await expect(page.locator('details[open]')).toContainText('13:52、14:01、14:11、14:20、14:31、14:41');
  await page.getByText('会場の公式アクセス（22件）', { exact: true }).click();
  await expect(page.locator('details').filter({ hasText: '会場の公式アクセス（22件）' }).locator('.venue-list li')).toHaveCount(22);
  await page.getByText('J1各試合の公式日程（380件）', { exact: true }).click();
  await expect(page.locator('details').filter({ hasText: 'J1各試合の公式日程（380件）' }).locator('.venue-list li')).toHaveCount(380);
});

test('demo is retained and links to the real-data assessment explicitly', async ({ page }) => {
  await page.goto('/?data=demo#/sources?date=2026-11-07');
  await expect(page.locator('main')).toContainText('現在は架空のデモを表示しています');
  await expect(page.locator('.evidence-table')).toHaveCount(0);
  await expect(page.locator('.reference-card')).toHaveCount(8);
  await page.getByRole('link', { name: 'J1の検証結果を開く' }).click();
  await expect(page.locator('.evidence-table')).toHaveCount(2);
  await expect(page.locator('.real-banner')).toBeVisible();
});

test('invalid evidence shows a recoverable error without blocking existing search', async ({ page }) => {
  await page.route('**/data/time-evidence.json*', route => route.fulfill({ contentType: 'text/javascript', body: 'export default {schemaVersion:0};' }));
  await page.goto('/#/sources');
  await expect(page.getByRole('alert')).toContainText('検証資料を読み込めませんでした');
  await page.getByRole('link', { name: '検索に戻る', exact: true }).click();
  await expect(page.getByRole('heading', { name: '日付と駅から試合を探す' })).toBeVisible();
});

for (const width of [360, 390, 768, 1440]) test(`evidence page at ${width}px supports reading and keyboard controls`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  const errors: string[] = [], external: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:5187')) external.push(request.url()); });
  await page.goto('/#/sources?date=2026-11-07');
  await expect(page.getByRole('heading', { level: 1, name: '検証・参照リンク' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `../.qa/time-evidence/sources-${width}.png` });
  const revisedReturn = page.getByRole('cell', { name: /16:05〜18:45$/ });
  await revisedReturn.scrollIntoViewIfNeeded();
  await expect(revisedReturn).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `../.qa/early-departure/comparison-${width}.png` });
  await page.getByRole('button', { name: '参照URL一覧へ' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#references-title')).toBeFocused();
  await page.screenshot({ path: `../.qa/time-evidence/links-${width}.png` });
  const summary = page.getByText('会場の公式アクセス（22件）', { exact: true });
  await summary.focus(); await page.keyboard.press('Enter');
  await expect(summary.locator('..')).toHaveAttribute('open', '');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]); expect(external).toEqual([]);
});

test('evidence and source URLs remain readable at 200% zoom', async ({}, testInfo) => {
  const profile = testInfo.outputPath('evidence-zoom-profile');
  await mkdir(`${profile}/Default`, { recursive: true });
  await writeFile(`${profile}/Default/Preferences`, JSON.stringify({ partition: { default_zoom_level: { x: Math.log(2) / Math.log(1.2) } } }));
  const context = await chromium.launchPersistentContext(profile, { channel: process.env.CI ? 'chromium' : 'msedge', viewport: null, args: ['--window-size=1440,1000'] });
  await useReferenceData(context);
  try {
    const page = context.pages()[0];
    await page.goto('http://127.0.0.1:5187/#/sources');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => devicePixelRatio)).toBe(2);
    await page.getByRole('button', { name: '参照URL一覧へ' }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: '../.qa/time-evidence/links-zoom200.png' });
  } finally { await context.close(); }
});

