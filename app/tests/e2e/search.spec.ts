import { expect, test } from '@playwright/test';

test('default, draft, candidates, actual search and calendar', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?data=demo');
  await expect(page.locator('.result-count')).toContainText('5駅');
  await expect(page.locator('.result-count')).toContainText('3試合');
  await expect(page.locator('#search-date')).toHaveValue('2026-11-07');
  await page.getByRole('combobox').fill('ﾄﾋﾞﾀｷｭｳ');
  await expect(page.getByRole('option')).toContainText('飛田給駅');
  await page.getByRole('combobox').press('ArrowDown');
  await page.getByRole('combobox').press('Enter');
  await expect(page.locator('.result-count')).toContainText('5駅');
  await page.getByRole('button', { name: '検索する' }).click();
  await expect(page.locator('.result-count')).toContainText('1駅');
  await expect(page.locator('.station-card')).toHaveCount(1);
  await expect(page.locator('.window-values')).toContainText('12:30〜14:45');
  await expect(page.locator('.window-values')).toContainText('16:55〜18:45');
  await page.getByRole('link', { name: '月間', exact: true }).click();
  await expect(page.locator('.calendar tbody button')).toHaveCount(42);
  await page.getByRole('button', { name: '次の月' }).click();
  await expect(page.locator('#search-date')).toHaveValue('2026-12-01');
  await page.getByRole('button', { name: '次の月' }).click();
  await expect(page.getByRole('heading', { name: 'デモ収録範囲外です' })).toBeVisible();
  expect(errors).toEqual([]);
});
test('unselected input and empty search remain distinct', async ({ page }) => {
  await page.goto('/?data=demo');
  await page.getByRole('combobox').fill('味スタ');
  await expect(page.getByRole('option')).toContainText('味の素スタジアム');
  await page.getByRole('button', { name: '検索する' }).click();
  await expect(page.getByRole('alert')).toContainText('候補から場所を選んでください');
  await page.getByRole('button', { name: '場所の入力を消す' }).click();
  await page.locator('#search-date').fill('2026-11-09');
  await expect(page.locator('.result-count')).toContainText('3試合');
  await page.getByRole('button', { name: '検索する' }).click();
  await expect(page.getByRole('heading', { name: '対象のサンプル試合はありません' })).toBeVisible();
});
