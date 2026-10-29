import { expect, test } from '@playwright/test';

const key = 'oikomu:demo:v1:favorites';
const stationUrl = '/?data=demo#/search?date=2026-11-07&place=station:st-tobitakyu&view=list';

test('search → station → match → back, favorites and reload', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(stationUrl);
  await page.getByRole('button', { name: '飛田給駅をお気に入りに登録' }).click();
  await expect(page.getByRole('button', { name: '飛田給駅をお気に入りから解除' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('link', { name: '駅の詳細を見る' }).click();
  await expect(page.getByRole('heading', { name: '飛田給駅', exact: true, level: 1 })).toBeFocused();
  await page.locator('.station-card .match-title a').click();
  await expect(page.getByRole('heading', { name: 'サンプル試合の詳細' })).toBeFocused();
  await expect(page.locator('.window-values').first()).toContainText('16:55〜18:45');
  await page.goBack();
  await expect(page.getByRole('heading', { name: '飛田給駅', exact: true, level: 1 })).toBeVisible();
  await page.goBack();
  await expect(page.locator('.result-count')).toContainText('1駅');
  await page.goForward();
  await expect(page.getByRole('heading', { name: '飛田給駅', exact: true, level: 1 })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: '飛田給駅をお気に入りから解除' }).first()).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('navigation', { name: 'メインナビゲーション' }).getByRole('link', { name: 'お気に入り', exact: true }).click();
  await expect(page.locator('.favorites-grid .station-card')).toHaveCount(1);
  await page.getByRole('button', { name: '飛田給駅をお気に入りから解除' }).click();
  await expect(page.getByRole('heading', { name: 'お気に入りの駅はありません' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('corrupt favorites and save denial stay usable', async ({ page, context }) => {
  await page.goto('/?data=demo');
  await page.evaluate(key => localStorage.setItem(key, '{broken'), key);
  await page.reload();
  await expect(page.getByText('保存されたお気に入りを読み込めなかったため、空の状態で開始しました。')).toBeVisible();
  await context.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('denied for test'); };
    Storage.prototype.setItem = () => { throw new Error('denied for test'); };
    Storage.prototype.removeItem = () => { throw new Error('denied for test'); };
  });
  await page.goto(stationUrl);
  await page.reload();
  await expect(page.getByText('この環境では保存できないため、開いている間だけ保持します。')).toBeVisible();
  await page.getByRole('button', { name: '飛田給駅をお気に入りに登録' }).click();
  await page.getByRole('navigation', { name: 'メインナビゲーション' }).getByRole('link', { name: 'お気に入り', exact: true }).click();
  await expect(page.locator('.favorites-grid .station-card')).toHaveCount(1);
});

test('reset confirmation traps focus, Escape cancels, unrelated keys remain', async ({ page }) => {
  await page.goto('/?data=demo');
  await page.evaluate(key => { localStorage.setItem(key, JSON.stringify({ schemaVersion: 1, stationIds: ['st-tobitakyu'] })); localStorage.setItem('unrelated', 'preserve'); }, key);
  await page.goto('/?data=demo#/about');
  const trigger = page.getByRole('button', { name: 'お気に入りをすべて解除', exact: true });
  await trigger.click();
  await expect(page.getByRole('button', { name: 'キャンセル' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'すべて解除する', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'キャンセル' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByRole('button', { name: 'すべて解除する', exact: true }).click();
  await expect(page.getByText('お気に入りをすべて解除しました。')).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('unrelated'))).toBe('preserve');
});

test('clipboard copy restores the same conditions', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/?data=demo#/search?date=2026-11-28&place=station:st-kozukue&view=calendar');
  await page.getByRole('button', { name: 'URLをコピー', exact: true }).click();
  await expect(page.getByText('URLをコピーしました。')).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  const second = await context.newPage();
  await second.goto(copied);
  await expect(second.locator('#search-date')).toHaveValue('2026-11-28');
  await expect(second.locator('.result-count')).toContainText('1試合');
  await expect(second.locator('.calendar tbody button')).toHaveCount(42);
});

test('clipboard failure offers a selected URL', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('denied')) } }); });
  await page.goto(stationUrl);
  await page.getByRole('button', { name: 'URLをコピー', exact: true }).click();
  const field = page.getByRole('textbox', { name: '共有するURL' });
  await expect(field).toBeFocused();
  expect(await field.evaluate((element: HTMLTextAreaElement) => element.selectionEnd - element.selectionStart)).toBe((await field.inputValue()).length);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'URLをコピー', exact: true })).toBeFocused();
});

for (const [date, station, count, label, windows] of [
  ['2026-11-21', 'tobitakyu', '1試合', '開始時刻未定', 0],
  ['2026-11-22', 'urawamisono', '0試合', '延期', 0],
  ['2026-11-23', 'soga', '0試合', '中止', 0],
  ['2026-11-28', 'kozukue', '1試合', '会場変更', 1],
  ['2026-11-28', 'tobitakyu', '0試合', '会場変更済み', 0],
  ['2026-12-05', 'kashiwa', '0試合', '日程変更済み', 0],
  ['2026-12-06', 'kashiwa', '1試合', '日程変更', 1],
] as const) test(`status ${date} ${station}`, async ({ page }) => {
  await page.goto(`/?data=demo#/search?date=${date}&place=station:st-${station}&view=list`);
  await expect(page.locator('.result-count')).toContainText(count);
  await expect(page.locator('main')).toContainText(label);
  await expect(page.locator('.time-windows')).toHaveCount(windows);
});

test('venue TBD, unknown IDs and invalid date are distinct', async ({ page }) => {
  await page.goto('/?data=demo#/search?date=2026-12-20&place=all');
  await expect(page.locator('.result-count')).toContainText('開催予定 0試合');
  await expect(page.getByRole('heading', { name: '会場未定 1件' })).toBeVisible();
  await page.goto('/?data=demo#/search?date=2026-12-20&place=station:st-tobitakyu');
  await expect(page.getByRole('heading', { name: '会場未定 1件' })).toHaveCount(0);
  for (const path of ['/stations/unknown', '/matches/unknown', '/unknown']) {
    await page.goto(`/?data=demo#${path}`);
    await expect(page.getByRole('heading', { name: 'ページが見つかりません' })).toBeVisible();
    await expect(page.locator('.demo-banner')).toBeVisible();
  }
  await page.goto('/?data=demo#/search?date=2026-02-30&place=bad&view=calendar&month=2027-01&unknown=true');
  await expect(page.locator('#search-date')).toHaveValue('2026-11-07');
  await expect(page.getByText('日付をデモ基準日に戻しました。')).toHaveCount(1);
  await expect(page).toHaveURL(/month=2026-11$/);
  await page.reload();
  await expect(page.getByText('日付をデモ基準日に戻しました。')).toHaveCount(0);
});

test('US timezone preserves Japanese dates and windows', async ({ browser }) => {
  const context = await browser.newContext({ timezoneId: 'America/Los_Angeles' });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5187' + stationUrl);
  await expect(page.locator('#search-date')).toHaveValue('2026-11-07');
  await expect(page.locator('.window-values')).toContainText('16:55〜18:45');
  await page.getByRole('link', { name: '月間', exact: true }).click();
  await expect(page.locator('.calendar tbody button').first()).toHaveAttribute('aria-label', /2026年10月26日/);
  await context.close();
});
