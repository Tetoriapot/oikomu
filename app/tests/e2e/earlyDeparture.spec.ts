import { expect, test } from './fixtures';

test('revised returns are consistent in search, calendar, station, match and saved favorites', async ({ page }) => {
  await page.goto('/#/search?date=2026-11-07&place=station:st-tobitakyu&view=list');
  const checkWindow = async () => {
    await expect(page.locator('.window-value.departure').first()).toContainText('16:05〜18:45');
    await expect(page.locator('.window-value.departure').first()).toContainText('早期退場を含む');
    await expect(page.locator('.window-value.arrival').first()).toContainText('12:30〜14:45');
  };
  await checkWindow();
  await page.getByRole('button', { name: '飛田給駅をお気に入りに登録' }).click();
  await page.getByRole('link', { name: '月間', exact: true }).click(); await checkWindow();
  await page.getByRole('link', { name: '駅の詳細を見る' }).click(); await checkWindow();
  await page.locator('.station-card .match-title a').click(); await checkWindow();
  await page.getByText('時間帯の出し方', { exact: true }).click();
  await expect(page.locator('.calculation')).toContainText('帰宅の目安はKの60分後＋W');
  await expect(page.locator('.calculation')).toContainText('試合終了の見込みは開始110〜130分後');
  await page.goto('/#/favorites?date=2026-11-07'); await page.reload(); await checkWindow();
  await expect(page.getByRole('button', { name: '飛田給駅をお気に入りから解除' })).toBeVisible();
});

test('sources explain the changed assumption and preserve before/after evidence', async ({ page }) => {
  await page.goto('/#/sources');
  await expect(page.getByRole('heading', { name: '早期退場を考慮し、帰宅時間帯の始点を早めました' })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.locator('main')).toContainText('開始110分後＋徒歩時間');
  await expect(page.locator('main')).toContainText('開始60分後＋徒歩時間');
  const row = page.locator('.evidence-table tbody tr').filter({ hasText: '2025-05-25' }).filter({ hasText: '帰宅・駅出発' });
  await expect(row).toContainText('16:55〜18:45'); await expect(row).toContainText('16:05〜18:45');
  await expect(page.locator('main')).toContainText('全国の駅で混雑が始まる時刻を実測した値ではありません');
  await expect(page.locator('.reference-card')).toHaveCount(8);
  await expect(page.locator('main')).not.toContainText('この例だけで全国の係数を変更していません');
});

test('demo retains its old return interval and does not show the J1 early-departure label', async ({ page }) => {
  await page.goto('/?data=demo#/search?date=2026-11-07&place=station:st-tobitakyu&view=list');
  await expect(page.locator('.window-value.departure')).toContainText('16:55〜18:45');
  await expect(page.locator('.time-windows')).not.toContainText('早期退場を含む');
});
