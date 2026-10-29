import { chromium, expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const pages = [
  ['search', '/search?date=2026-11-07&place=all&view=list'],
  ['calendar', '/search?date=2026-11-07&place=all&view=calendar'],
  ['station', '/stations/st-tobitakyu?date=2026-11-07'],
  ['match', '/matches/m12?date=2026-11-28'],
  ['favorites', '/favorites?date=2026-11-07'],
  ['about', '/about'],
  ['notfound', '/matches/unknown'],
] as const;

for (const width of [360, 390, 768, 1440]) test(`all pages at ${width}px`, async ({ page }) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  const external: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
  page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:5187') && !request.url().startsWith('data:')) external.push(request.url()); });
  await page.setViewportSize({ width, height: 900 });
  await page.addInitScript(() => localStorage.setItem('oikomu:demo:v1:favorites', JSON.stringify({ schemaVersion: 1, stationIds: ['st-tobitakyu', 'st-kashiwa'] })));
  for (const [name, path] of pages) {
    await page.goto('/?data=demo#' + path);
    const headings = { search: '日付と駅から試合を探す', calendar: '日付と駅から試合を探す', station: '飛田給駅', match: 'サンプル試合の詳細', favorites: 'お気に入りの駅', about: 'オイコムについて', notfound: 'ページが見つかりません' };
    await expect(page.getByRole('heading', { level: 1, name: headings[name], exact: true })).toBeVisible();
    if (name === 'calendar') await expect(page.locator('.calendar tbody button')).toHaveCount(42);
    if (name === 'search') await expect(page.locator('.view-switch a').first()).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('.demo-banner')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name}: horizontal overflow`).toBe(true);
    const overflow = await page.locator('main button, main input, main textarea, main h1, main h2, main h3, .window-value').evaluateAll(nodes => nodes.filter(node => { const r = node.getBoundingClientRect(); return r.width > 0 && (r.left < -1 || r.right > innerWidth + 1); }).map(n => n.textContent));
    expect(overflow, name).toEqual([]);
    for (const card of await page.locator('.match-card').all()) await expect(card).toContainText('サンプル試合');
    for (const windows of await page.locator('.time-windows').all()) await expect(windows).toContainText('目安・デモ計算');
    await page.screenshot({ path: `../.qa/${width}-${name}.png`, fullPage: true });
  }
  await page.goto('/?data=demo#/search?date=2026-11-07&place=station:st-tobitakyu');
  await page.getByRole('button', { name: 'URLをコピー', exact: true }).scrollIntoViewIfNeeded();
  if (width < 760) {
    const button = await page.getByRole('button', { name: 'URLをコピー', exact: true }).boundingBox();
    const nav = await page.locator('.bottom-nav').boundingBox();
    expect(button!.y + button!.height).toBeLessThanOrEqual(nav!.y);
  }
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test('actual browser zoom at 200% preserves all pages and controls', async ({}, testInfo) => {
  const profile = testInfo.outputPath('zoom-profile');
  await mkdir(`${profile}/Default`, { recursive: true });
  // Chromium stores a zoom level in the default storage partition "x".
  await writeFile(`${profile}/Default/Preferences`, JSON.stringify({ partition: { default_zoom_level: { x: Math.log(2) / Math.log(1.2) } } }));
  const context = await chromium.launchPersistentContext(profile, { channel: process.env.CI ? 'chromium' : 'msedge', viewport: null, args: ['--window-size=1440,1000'] });
  try {
    const page = context.pages()[0];
    for (const [name, path] of pages) {
      await page.goto('http://127.0.0.1:5187/?data=demo#' + path);
      await expect(page.locator('.site-header')).toBeVisible();
      if (name === 'calendar') await expect(page.locator('.calendar tbody button')).toHaveCount(42);
      expect(await page.evaluate(() => devicePixelRatio)).toBe(2);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `../.qa/zoom200-${name}.png` });
    }
    await page.goto('http://127.0.0.1:5187/?data=demo#/search?date=2026-11-07&place=all&view=calendar');
    await page.getByRole('button', { name: '次の月' }).click();
    await expect(page.locator('#search-date')).toHaveValue('2026-12-01');
    await page.goto('http://127.0.0.1:5187/?data=demo#/about');
    await page.getByRole('button', { name: 'お気に入りをすべて解除', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'キャンセル' }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { await context.close(); }
});

test('loading failure is not an empty result and retry works', async ({ page }) => {
  await page.route('**/src/data/repository.ts*', route => route.abort());
  await page.goto('/?data=demo');
  await expect(page.getByRole('heading', { name: 'データを読み込めませんでした' })).toBeVisible();
  await expect(page.getByText('対象のサンプル試合はありません')).toHaveCount(0);
  await expect(page.locator('.demo-banner')).toBeVisible();
  await page.unroute('**/src/data/repository.ts*');
  await page.getByRole('button', { name: '再読み込み' }).click();
  await expect(page.locator('.result-count')).toContainText('3試合');
});

test('keyboard focus, suggestion escape and reset date preserve context', async ({ page }) => {
  await page.goto('/?data=demo#/search?date=2026-12-06&place=station:st-kashiwa&view=calendar');
  const input = page.getByRole('combobox');
  await input.fill('ﾄﾋﾞﾀｷｭｳ');
  await input.press('ArrowDown');
  await input.press('Escape');
  await expect(input).toHaveAttribute('aria-expanded', 'false');
  await input.press('ArrowDown');
  await input.press('Enter');
  await page.getByRole('button', { name: '検索する' }).focus();
  expect(await page.getByRole('button', { name: '検索する' }).evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe('none');
  await page.getByRole('button', { name: '検索する' }).press('Enter');
  await page.getByRole('link', { name: '使い方', exact: true }).click();
  await page.getByRole('link', { name: 'デモ基準日へ戻る' }).click();
  await expect(page.locator('#search-date')).toHaveValue('2026-11-07');
  await expect(page.locator('.selection-chip')).toContainText('飛田給駅');
  await expect(page.locator('.calendar tbody button')).toHaveCount(42);
});

