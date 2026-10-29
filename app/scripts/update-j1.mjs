import fs from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { setTimeout as rateLimit } from 'node:timers/promises';
import { parseSchedule, parseDetailNote, buildDataset, sha256 } from './j1-source.mjs';
import { validateDataset } from '../src/data/validate.ts';

const root = process.env.OIKOMU_DATA_DIR ? pathToFileURL(path.resolve(process.env.OIKOMU_DATA_DIR) + path.sep) : new URL('../../data/', import.meta.url);
const output = new URL('j1.json', root), evidence = new URL('sources/j1-2026-27.json', root);
const offline = process.argv.includes('--offline');
async function fetchText(url) {
  const target = new URL(url);
  if (target.protocol !== 'https:' || target.hostname !== 'www.jleague.jp') throw new Error('公式サイト以外は取得できません。');
  await rateLimit(500);
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000), redirect: 'error', headers: { 'User-Agent': 'OikomuDemo/1.1 (+https://github.com/Tetoriapot/oikomu)' } });
  if (!response.ok) throw new Error(`公式データを取得できませんでした（${response.status}）。`);
  const html = await response.text();
  if (html.length > 12_000_000) throw new Error('公式ページが想定サイズを超えています。');
  return html;
}
try {
  const access = JSON.parse(await fs.readFile(new URL('j1-access.json', root), 'utf8'));
  let previous = null;
  try { previous = validateDataset(JSON.parse(await fs.readFile(output, 'utf8'))); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  let raw;
  if (offline) raw = JSON.parse(await fs.readFile(evidence, 'utf8'));
  else {
    const firstYear = Number(access.season.slice(0, 4)), nextYear = firstYear + 1;
    const periods = [[`${firstYear}-08-01`, `${firstYear}-12-31`], [`${nextYear}-01-01`, `${nextYear}-03-31`], [`${nextYear}-04-01`, `${nextYear}-06-30`]];
    const rows = new Map(), scheduleSources = [];
    for (const [start, end] of periods) {
      const url = `https://www.jleague.jp/j1/match/search-list/?category=j1&period=custom&startdate=${start}&enddate=${end}`;
      const html = await fetchText(url), checkedAt = new Date().toISOString(), matches = parseSchedule(html);
      scheduleSources.push({ url, checkedAt, sha256: sha256(html), count: matches.length });
      for (const m of matches) {
        if (rows.has(m.officialId)) throw new Error('期間をまたいだ重複試合があります。');
        rows.set(m.officialId, { ...m, checkedAt, note: '' });
      }
    }
    if (rows.size !== 380) throw new Error(`全380試合のうち${rows.size}試合しか取得できませんでした。`);
    let count = 0;
    for (const match of rows.values()) {
      if (match.state === 'game-over') continue;
      match.note = parseDetailNote(await fetchText(match.url));
      match.checkedAt = new Date().toISOString();
      if (++count % 25 === 0) process.stdout.write(`試合の注記を${count}件確認しました。\n`);
    }
    raw = { season: access.season, updatedAt: new Date().toISOString(), scheduleSources, matches: [...rows.values()] };
  }
  const data = buildDataset(raw, access, previous, validateDataset);
  const temp = new URL('j1.pending.json', root);
  await fs.writeFile(temp, JSON.stringify(data, null, 2) + '\n');
  // Validate the saved candidate before replacing the working snapshot.
  validateDataset(JSON.parse(await fs.readFile(temp, 'utf8')));
  await fs.mkdir(new URL('sources/', root), { recursive: true });
  if (!offline) await fs.writeFile(evidence, JSON.stringify(raw, null, 2) + '\n');
  if (previous) await fs.copyFile(output, new URL('j1.previous.json', root));
  await fs.rename(temp, output);
  process.stdout.write(`J1の${data.matches.length}試合・${data.stadiums.length}会場・${data.stations.length}駅を保存しました。\n${fileURLToPath(output)}\n`);
} catch (error) {
  process.stderr.write(`更新に失敗しました。既存のJ1データは変更していません。\n${error.message}\n`);
  process.exitCode = 1;
}
