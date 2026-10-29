import { describe, expect, it, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { readCollection, saveSnapshot, recordFailure, digest } from '../../scripts/collection-store.mjs';
import { validateCollection } from '../../src/data/validateCollection.ts';
import { validateDataset } from '../../src/data/validate.ts';
import { buildDataset } from '../../scripts/j1-source.mjs';

const read = async file => JSON.parse(await fs.readFile(new URL(file, import.meta.url), 'utf8'));
const raw = await read('../../../data/sources/j1-2026-27.json');
const current = await read('../../../data/j1.json');
const access = await read('../../../data/j1-access.json');
const dirs = [];
const testRoot = path.resolve('test-results/collection');
async function prepare() {
  await fs.mkdir(testRoot, { recursive: true });
  const root = await fs.mkdtemp(path.join(testRoot, 'oikomu-collection-')); dirs.push(root);
  await fs.mkdir(path.join(root, 'sources'));
  await fs.writeFile(path.join(root, 'j1.json'), JSON.stringify(current));
  await fs.writeFile(path.join(root, 'sources/j1-2026-27.json'), JSON.stringify(raw));
  return root;
}
afterEach(async () => { for (const root of dirs.splice(0)) if (path.dirname(root) === testRoot && path.basename(root).startsWith('oikomu-collection-')) await fs.rm(root, { recursive: true, force: true }); });

describe('daily collection and immutable history', () => {
  it('archives facts, restores them exactly, and deduplicates the same collection', async () => {
    const root = await prepare();
    const first = await saveSnapshot(root, raw, current);
    const snapshot = first.snapshots[0];
    const bytes = await fs.readFile(path.join(root, snapshot.path.slice(5)));
    expect(digest(bytes)).toBe(snapshot.sha256);
    expect(JSON.parse(gunzipSync(bytes).toString())).toEqual({ schemaVersion: 1, raw, dataset: current });
    expect((await saveSnapshot(root, raw, current)).snapshots).toHaveLength(1);
    expect(first.latestAttempt).toBeNull();
  });
  it('appends new successes without replacing older observations and uses Japanese dates', async () => {
    const root = await prepare(); await saveSnapshot(root, raw, current);
    const nextRaw = structuredClone(raw); nextRaw.updatedAt = new Date(Date.parse(raw.updatedAt) + 86_400_000).toISOString();
    const next = buildDataset(nextRaw, access, current, validateDataset);
    const result = await saveSnapshot(root, nextRaw, next);
    expect(result.snapshots).toHaveLength(2);
    expect(result.lastSuccessAt).toBe(nextRaw.updatedAt);
    expect(result.snapshots[1].dateJst).toBe(new Date(Date.parse(nextRaw.updatedAt) + 9 * 3_600_000).toISOString().slice(0, 10));
    await expect(saveSnapshot(root, raw, current)).rejects.toThrow('古い取得データ');
  });
  it('refuses conflicting observations with the same timestamp', async () => {
    const root = await prepare(); await saveSnapshot(root, raw, current);
    const changed = structuredClone(current); changed.meta.notice += '変更';
    await expect(saveSnapshot(root, raw, changed)).rejects.toThrow('同じ取得日時');
    expect((await readCollection(root)).snapshots).toHaveLength(1);
  });
  it('rolls back both data files and the manifest if promotion fails halfway', async () => {
    const root = await prepare(); await saveSnapshot(root, raw, current);
    const names = ['j1.json', 'sources/j1-2026-27.json', 'collection.json'];
    const before = await Promise.all(names.map(name => fs.readFile(path.join(root, name), 'utf8')));
    const nextRaw = structuredClone(raw); nextRaw.updatedAt = new Date(Date.parse(raw.updatedAt) + 60_000).toISOString();
    const next = buildDataset(nextRaw, access, current, validateDataset);
    let writes = 0;
    await expect(saveSnapshot(root, nextRaw, next, { write: async (file, value) => { if (++writes === 2) throw new Error('disk failure'); await fs.writeFile(file, value); } })).rejects.toThrow('disk failure');
    expect(await Promise.all(names.map(name => fs.readFile(path.join(root, name), 'utf8')))).toEqual(before);
  });
  it('records failure without changing the last success or its data', async () => {
    const root = await prepare(); const first = await saveSnapshot(root, raw, current);
    const before = await fs.readFile(path.join(root, 'j1.json'), 'utf8');
    await recordFailure(root, new Date().toISOString());
    const failed = await readCollection(root);
    expect(failed.lastSuccessAt).toBe(first.lastSuccessAt);
    expect(failed.snapshots).toEqual(first.snapshots);
    expect(failed.latestAttempt.status).toBe('failed');
    expect(await fs.readFile(path.join(root, 'j1.json'), 'utf8')).toBe(before);
  });
  it('rejects broken manifests and unsafe archive paths before opening files', async () => {
    const root = await prepare(); const good = await saveSnapshot(root, raw, current);
    for (const mutate of [x => { x.snapshots[0].path = '../secret'; }, x => { x.snapshots.push(x.snapshots[0]); }, x => { x.snapshots[0].sha256 = 'bad'; }, x => { x.snapshots[0].matchCount = -1; }, x => { x.lastSuccessAt = null; }, x => { x.latestAttempt = { status: 'ok' }; }]) {
      const bad = structuredClone(good); mutate(bad); expect(() => validateCollection(bad)).toThrow();
    }
  });
});
