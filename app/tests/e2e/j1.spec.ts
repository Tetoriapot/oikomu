import { chromium, expect, test, useReferenceData } from './fixtures';
import { mkdir, writeFile } from 'node:fs/promises';

test('real data is default, today uses JST and a next match can be opened', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-29T04:00:00Z') });
  await page.goto('/');
  await expect(page.locator('#search-date')).toHaveValue('2026-10-29');
  await expect(page.locator('.real-banner')).toContainText('J1公式日程');
  await expect(page.locator('.coverage-label')).toContainText('20クラブ・22会場・39駅');
  await page.getByRole('link', { name: '次の開催日 2026-10-31 を表示' }).click();
  await expect(page.locator('.result-count')).toContainText('6試合');
  await expect(page.locator('main')).not.toContainText('サンプル試合');
});

test('national search, station detail, match source and query sharing stay consistent', async ({ page, context }) => {
  await page.goto('/#/search?date=2026-11-07&place=all&view=list');
  await expect(page.locator('.result-count')).toContainText('6試合');
  await expect(page.locator('.result-count')).toContainText('9駅');
  const box = page.getByRole('combobox');
  await box.fill('飛田給'); await box.press('ArrowDown'); await box.press('Enter');
  await page.getByRole('button', { name: '検索する' }).click();
  await expect(page.locator('.result-count')).toContainText('1試合');
  await page.getByRole('link', { name: '駅の詳細を見る' }).click();
  await page.locator('.station-card .match-title a').click();
  await expect(page.getByRole('heading', { name: 'J1の試合詳細' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'この試合の公式日程・最新情報 ↗' })).toHaveAttribute('href', /https:\/\/www.jleague.jp\/match\/j1\/2026\//);
  await expect(page.locator('main')).toContainText('公式日程の確認日時');
  await expect(page.locator('.window-note').first()).toContainText('未検証');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: 'URLをコピー', exact: true }).click();
  const url = await page.evaluate(() => navigator.clipboard.readText());
  const other = await context.newPage(); await other.goto(url);
  await expect(other.getByRole('heading', { name: 'J1の試合詳細' })).toBeVisible();
  await page.goBack(); await page.goBack();
  await expect(page.locator('#search-date')).toHaveValue('2026-11-07');
  await expect(page.locator('.selection-chip')).toContainText('飛田給');
});

test('real alternate venue uses national stadium stations, not the home club stadium', async ({ page }) => {
  await page.goto('/#/matches/j1-2026-27-kashima-tokyov?date=2026-12-19');
  await expect(page.locator('main')).toContainText('MUFGスタジアム');
  await expect(page.locator('.station-card')).toHaveCount(4);
  await expect(page.locator('.station-list')).toContainText('国立競技場駅');
  await expect(page.locator('.station-list')).not.toContainText('鹿島サッカースタジアム駅');
});

test('undecided dates, conditional alternatives and bus access are explained without false time bands', async ({ page }) => {
  await page.goto('/#/search?date=2027-02-14&place=stadium:sd-nagai&view=calendar');
  await expect(page.locator('.result-count')).toContainText('0試合');
  await expect(page.getByRole('heading', { name: 'この日が開催候補の試合' })).toBeVisible();
  await expect(page.locator('main')).toContainText('2027-02-13・2027-02-14');
  await expect(page.locator('.time-windows')).toHaveCount(0);
  await page.goto('/#/search?date=2027-02-24&place=station:st-kashiwa');
  await expect(page.getByRole('heading', { name: '条件によりこの日に変更される可能性がある試合' })).toBeVisible();
  await expect(page.locator('.result-count')).toContainText('0試合');
  await page.goto('/#/search?date=2026-11-01&place=station:st-tsurukawa');
  await expect(page.locator('.result-count')).toContainText('1試合');
  await expect(page.locator('main')).toContainText('バス利用');
  await expect(page.locator('.time-windows')).toHaveCount(0);
});

test('J1 favorites inherit demo, survive edits and reset without modifying demo', async ({ page }) => {
  await page.goto('/');
  const saved = JSON.stringify({ schemaVersion: 1, stationIds: ['st-tobitakyu', 'st-kashiwa'] });
  await page.evaluate(value => localStorage.setItem('oikomu:demo:v1:favorites', value), saved);
  await page.goto('/#/favorites?date=2026-11-07'); await page.reload();
  await expect(page.locator('.favorites-grid .station-card')).toHaveCount(2);
  await page.getByRole('button', { name: '柏駅をお気に入りから解除' }).click(); await page.reload();
  await expect(page.locator('.favorites-grid .station-card')).toHaveCount(1);
  await page.goto('/#/about');
  await page.getByRole('button', { name: 'お気に入りをすべて解除', exact: true }).click();
  await page.getByRole('button', { name: 'すべて解除する', exact: true }).click();
  await page.goto('/#/favorites'); await page.reload();
  await expect(page.getByRole('heading', { name: 'お気に入りの駅はありません' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('oikomu:demo:v1:favorites'))).toBe(saved);
  await page.goto('/?data=demo#/favorites?date=2026-11-07');
  await expect(page.locator('.favorites-grid .station-card')).toHaveCount(2);
});

test('stale, historical and outside-period states are distinct', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-09T04:00:00Z') });
  await page.goto('/#/search?date=2026-11-09&place=all');
  await expect(page.locator('.stale-banner')).toContainText('7日以上');
  await expect(page.locator('.empty-state')).toContainText('更新確認が必要');
  await page.goto('/#/search?date=2026-08-07&place=all');
  await expect(page.locator('.result-count')).toContainText('開催試合 2試合');
  await expect(page.locator('.match-card').first()).toContainText('試合終了');
  await page.goto('/#/search?date=2027-07-01&place=all');
  await expect(page.getByRole('heading', { name: '収録範囲外のため確認できません' })).toBeVisible();
});

test('favorites explain pending dates and conditional alternatives', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('oikomu:j1:v1:favorites', JSON.stringify({ schemaVersion: 1, stationIds: ['st-nagai', 'st-kashiwa'] })));
  await page.goto('/#/favorites?date=2027-02-14');
  await expect(page.locator('[data-station="st-nagai"]')).toContainText('この日が開催候補の試合があります');
  await expect(page.getByRole('heading', { name: 'この日が開催候補の試合' }).first()).toBeVisible();
  await page.goto('/#/favorites?date=2027-02-24');
  await expect(page.locator('[data-station="st-kashiwa"]')).toContainText('この日が開催候補の試合があります');
  await expect(page.getByRole('heading', { name: '条件によりこの日に変更される可能性がある試合' }).first()).toBeVisible();
});

test('real pages and candidate labels remain readable at 200% browser zoom', async ({}, testInfo) => {
  const profile = testInfo.outputPath('j1-zoom-profile');
  await mkdir(`${profile}/Default`, { recursive: true });
  await writeFile(`${profile}/Default/Preferences`, JSON.stringify({ partition: { default_zoom_level: { x: Math.log(2) / Math.log(1.2) } } }));
  const context = await chromium.launchPersistentContext(profile, { channel: process.env.CI ? 'chromium' : 'msedge', viewport: null, args: ['--window-size=1440,1000'] });
  await useReferenceData(context);
  try {
    const page = context.pages()[0];
    for (const path of ['/search?date=2026-11-07', '/search?date=2027-02-13&view=calendar', '/stations/st-tsurukawa?date=2026-11-01', '/matches/j1-2026-27-cosaka-gosaka', '/favorites', '/about']) {
      await page.goto('http://127.0.0.1:5187/#' + path);
      await expect(page.locator('main h1')).toBeVisible();
      expect(await page.evaluate(() => devicePixelRatio)).toBe(2);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (path.includes('calendar')) await expect(page.locator('.calendar tbody button')).toHaveCount(42);
    }
    await page.getByRole('button', { name: 'お気に入りをすべて解除', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'キャンセル' }).click();
    await page.screenshot({ path: '../.qa/j1-zoom200-about.png' });
  } finally { await context.close(); }
});

for (const width of [360, 390, 768, 1440]) test(`real pages at ${width}px have no overflow or external data requests`, async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width, height: 900 });
  const errors: string[] = [], external: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
  page.on('request', r => { if (!r.url().startsWith('http://127.0.0.1:5187') && !r.url().startsWith('data:')) external.push(r.url()); });
  const paths = [
    ['search', '/search?date=2026-11-07&place=all'], ['calendar', '/search?date=2027-02-13&place=all&view=calendar'],
    ['station', '/stations/st-kashima-stadium?date=2026-10-31'], ['match', '/matches/j1-2026-27-cosaka-gosaka?date=2027-02-13'],
    ['favorites', '/favorites'], ['about', '/about'], ['missing', '/matches/unknown'],
  ];
  for (const [name, path] of paths) {
    await page.goto('/#' + path);
    await expect(page.locator('.real-banner')).toBeVisible();
    await expect(page.locator('main h1')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), name).toBe(true);
    await expect(page.locator('main')).not.toContainText('サンプル試合');
    await page.screenshot({ path: `../.qa/j1-${width}-${name}.png`, fullPage: true });
  }
  expect(errors).toEqual([]); expect(external).toEqual([]);
});

