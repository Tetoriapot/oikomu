import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { validateDataset } from '../../src/data/validate';

const current = validateDataset(JSON.parse(readFileSync(new URL('../../../data/j1.json', import.meta.url), 'utf8')));

test('latest collected data loads without replacing it with regression fixtures', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: '日付と駅から試合を探す' })).toBeVisible();
  await expect(page.locator('.real-banner')).toContainText('J1公式日程');
  await expect(page.locator('.coverage-label')).toContainText(`${current.teams.length}クラブ・${current.stadiums.length}会場・${current.stations.length}駅`);
  const match = current.matches.find(item => item.status === 'scheduled') ?? current.matches[0];
  await page.goto(`/#/matches/${match.id}?date=${match.matchDate}`);
  await expect(page.getByRole('heading', { name: 'J1の試合詳細' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'この試合の公式日程・最新情報 ↗' })).toBeVisible();
  expect(errors).toEqual([]);
});
