import fs from 'node:fs/promises';
import path from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { validateDataset } from '../src/data/validate.ts';
import { validateCollection } from '../src/data/validateCollection.ts';

export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => JSON.stringify(value, null, 2) + '\n';
export async function readCollection(root) {
  try { return validateCollection(JSON.parse(await fs.readFile(path.join(root, 'collection.json'), 'utf8'))); }
  catch (error) { if (error.code === 'ENOENT') return { schemaVersion: 1, lastSuccessAt: null, latestAttempt: null, snapshots: [] }; throw error; }
}
export async function writeAtomic(file, bytes) {
  const temp = file + '.pending';
  await fs.writeFile(temp, bytes);
  await fs.rename(temp, file);
}
export async function recordFailure(root, startedAt) {
  const old = await readCollection(root);
  const next = validateCollection({ ...old, latestAttempt: { startedAt, finishedAt: new Date().toISOString(), status: 'failed' } });
  await writeAtomic(path.join(root, 'collection.json'), json(next));
}
export async function saveSnapshot(root, raw, dataset, { startedAt = null, write = writeAtomic } = {}) {
  validateDataset(dataset);
  if (raw.updatedAt !== dataset.meta.updatedAt || raw.season !== dataset.meta.season || raw.matches.length !== dataset.matches.length) throw new Error('取得原本と公開候補が一致しません。');
  const old = await readCollection(root);
  if (old.lastSuccessAt && Date.parse(raw.updatedAt) < Date.parse(old.lastSuccessAt)) throw new Error('古い取得データで最新情報を上書きできません。');
  const basename = `j1-${raw.updatedAt.replace(/[-:.]/g, '')}.json.gz`;
  const relativePath = `data/history/${basename}`;
  const compressed = gzipSync(json({ schemaVersion: 1, raw, dataset }), { level: 9 });
  const snapshot = { id: raw.updatedAt, checkedAt: raw.updatedAt, dateJst: new Date(Date.parse(raw.updatedAt) + 9 * 3_600_000).toISOString().slice(0, 10), path: relativePath, matchCount: dataset.matches.length, sha256: digest(compressed) };
  const existing = old.snapshots.find(item => item.id === snapshot.id);
  if (existing && existing.sha256 !== snapshot.sha256) throw new Error('同じ取得日時の履歴と内容が一致しません。既存の履歴は保持します。');
  const next = validateCollection({ ...old, lastSuccessAt: raw.updatedAt, latestAttempt: startedAt ? { startedAt, finishedAt: new Date().toISOString(), status: 'success' } : old.latestAttempt, snapshots: existing ? old.snapshots : [...old.snapshots, snapshot] });
  await fs.mkdir(path.join(root, 'history'), { recursive: true });
  const archive = path.join(root, 'history', basename);
  try { await fs.writeFile(archive, compressed, { flag: 'wx' }); }
  catch (error) { if (error.code !== 'EEXIST' || digest(await fs.readFile(archive)) !== snapshot.sha256) throw error; }
  // Read back before promotion. The manifest is written last, after both data files.
  const saved = JSON.parse(gunzipSync(await fs.readFile(archive)).toString('utf8'));
  validateDataset(saved.dataset);
  const files = [['j1.json', json(dataset)], ['sources/j1-2026-27.json', json(raw)], ['collection.json', json(next)]];
  const prior = await Promise.all(files.map(async ([name]) => {
    try { return await fs.readFile(path.join(root, name)); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  }));
  try {
    for (const [name, bytes] of files) await write(path.join(root, name), bytes);
  } catch (error) {
    for (let i = 0; i < files.length; i++) {
      const target = path.join(root, files[i][0]);
      if (prior[i] === null) await fs.rm(target, { force: true });
      else await writeAtomic(target, prior[i]);
    }
    throw error;
  }
  return next;
}
