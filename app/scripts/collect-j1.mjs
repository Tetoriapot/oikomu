import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { recordFailure, saveSnapshot } from './collection-store.mjs';
import { validateDataset } from '../src/data/validate.ts';

const root = path.resolve(process.env.OIKOMU_DATA_DIR ?? fileURLToPath(new URL('../../data/', import.meta.url)));
const archiveExisting = process.argv.includes('--archive-existing');
const startedAt = new Date().toISOString();
const lock = path.join(root, '.collection.lock');
let lockHandle, staging;
try {
  lockHandle = await fs.open(lock, 'wx');
  if (!archiveExisting) {
    staging = await fs.mkdtemp(path.join(root, '.update-stage-'));
    await fs.mkdir(path.join(staging, 'sources'));
    for (const name of ['j1-access.json', 'j1.json', 'sources/j1-2026-27.json']) await fs.copyFile(path.join(root, name), path.join(staging, name));
    const child = spawn(process.execPath, [fileURLToPath(new URL('update-j1.mjs', import.meta.url))], { env: { ...process.env, OIKOMU_DATA_DIR: staging }, stdio: 'inherit' });
    await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error('日程の取得・検証に失敗しました。'))); });
  }
  const source = staging ?? root;
  const raw = JSON.parse(await fs.readFile(path.join(source, 'sources/j1-2026-27.json'), 'utf8'));
  const data = validateDataset(JSON.parse(await fs.readFile(path.join(source, 'j1.json'), 'utf8')));
  const collection = await saveSnapshot(root, raw, data, { startedAt: archiveExisting ? null : startedAt });
  process.stdout.write(`取得データを保存しました。蓄積${collection.snapshots.length}回、最終成功${collection.lastSuccessAt}\n`);
} catch (error) {
  if (lockHandle && !archiveExisting) {
    try { await recordFailure(root, startedAt); } catch (statusError) { process.stderr.write(`更新失敗の記録も保存できませんでした。${statusError.message}\n`); }
  }
  process.stderr.write(`収集に失敗しました。公開用の日程と過去の取得記録は保持します。\n${error.message}\n`);
  process.exitCode = 1;
} finally {
  // Only remove the staging directory created in this run, inside the data root.
  if (staging && path.dirname(staging) === root && path.basename(staging).startsWith('.update-stage-')) await fs.rm(staging, { recursive: true, force: true });
  if (lockHandle) { await lockHandle.close(); await fs.unlink(lock); }
}
