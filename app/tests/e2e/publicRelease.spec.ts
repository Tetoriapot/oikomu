import { test, expect } from './fixtures';

test('header tools preserve context, theme and favorites after reload', async ({ page }) => {
  await page.goto('/#/search?date=2026-11-07&place=station:st-tobitakyu');
  await expect(page.getByRole('heading', { level: 1, name: '日付と駅から試合を探す' })).toBeVisible();
  await expect(page.locator('.demo-banner')).toContainText('デモ版・実験公開中');
  await page.getByRole('button', { name: '飛田給駅をお気に入りに登録' }).click();
  await page.getByRole('button', { name: 'ダークモード', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('link', { name: '更新情報', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('更新情報');
  await expect(page).toHaveURL(/date=2026-11-07&place=station%3Ast-tobitakyu/);
  await expect(page.getByText('毎日0:00（Asia/Tokyo）', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'ダークモード', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.header-tools').getByRole('link', { name: 'Help', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Help');
  await page.getByText('時間帯は実際の混雑を示していますか？', { exact: true }).click();
  await expect(page.getByRole('link', { name: '計算の検証結果と参照URL' })).toBeVisible();
  await page.getByRole('link', { name: '検索に戻る', exact: true }).click();
  await expect(page.getByRole('button', { name: '飛田給駅をお気に入りから解除' })).toBeVisible();
  await page.getByRole('button', { name: 'ライトモード', exact: true }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('system theme and unavailable storage still support theme controls', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException('blocked'); }; });
  await page.goto('/#/help');
  await expect(page.getByRole('button', { name: 'ダークモード', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'ライトモード', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.getByRole('status')).toContainText('表示モードを保存できません');
  await page.getByRole('button', { name: 'ダークモード', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('invalid collection history does not block search and can be diagnosed', async ({ page }) => {
  await page.route('**/data/collection.json*', route => route.fulfill({ contentType: 'text/javascript', body: 'export default {schemaVersion:0};' }));
  await page.goto('/#/updates');
  await expect(page.getByRole('alert')).toContainText('更新履歴を読み込めませんでした');
  await page.locator('.header-inner').getByRole('link', { name: '探す', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('日付と駅から試合を探す');
});

for (const width of [360, 390, 768, 1440]) test(`both themes and header controls at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const theme of ['light', 'dark'] as const) {
    for (const [name, path] of [['search', '/search?date=2026-11-07&place=station:st-tobitakyu'], ['calendar', '/search?date=2026-11-07&view=calendar'], ['help', '/help'], ['updates', '/updates'], ['sources', '/sources'], ['about', '/about']] as const) {
      await page.goto(`/#${path}`);
      await page.getByRole('button', { name: theme === 'light' ? 'ライトモード' : 'ダークモード', exact: true }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      for (const label of ['更新情報', 'Help']) await expect(page.locator('.header-tools').getByRole('link', { name: label, exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (['search', 'help', 'updates'].includes(name)) await page.screenshot({ path: `../.qa/public-release/${name}-${theme}-${width}.png` });
    }
  }
  expect(errors).toEqual([]);
});
