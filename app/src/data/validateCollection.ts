export interface CollectionSnapshot {
  id: string; checkedAt: string; dateJst: string; path: string;
  matchCount: number; sha256: string;
}
export interface CollectionInfo {
  schemaVersion: 1;
  lastSuccessAt: string | null;
  latestAttempt: { startedAt: string; finishedAt: string; status: 'success' | 'failed' } | null;
  snapshots: CollectionSnapshot[];
}
export function validateCollection(value: unknown): CollectionInfo {
  const validTime = (time: unknown): time is string => typeof time === 'string' && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(time) && Number.isFinite(Date.parse(time));
  const object = (item: unknown): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item);
  const fail = () => { throw new Error('更新履歴の形式が正しくありません。'); };
  if (!object(value) || value.schemaVersion !== 1 || !Array.isArray(value.snapshots)) return fail();
  if (value.lastSuccessAt !== null && !validTime(value.lastSuccessAt)) return fail();
  if (value.latestAttempt !== null) {
    const attempt = value.latestAttempt;
    if (!object(attempt) || !validTime(attempt.startedAt) || !validTime(attempt.finishedAt) || Date.parse(attempt.startedAt) > Date.parse(attempt.finishedAt) || !['success', 'failed'].includes(String(attempt.status))) return fail();
  }
  const ids = new Set<string>(), paths = new Set<string>();
  for (const row of value.snapshots) {
    if (!object(row) || typeof row.id !== 'string' || !validTime(row.checkedAt) || typeof row.dateJst !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(row.dateJst) || typeof row.path !== 'string' || !/^data\/history\/j1-\d{8}T\d{9}Z\.json\.gz$/.test(row.path) || typeof row.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(row.sha256) || !Number.isSafeInteger(row.matchCount) || Number(row.matchCount) <= 0 || ids.has(row.id) || paths.has(row.path)) return fail();
    const jst = new Date(Date.parse(row.checkedAt) + 9 * 3_600_000).toISOString().slice(0, 10);
    if (row.dateJst !== jst || row.id !== row.checkedAt || (value.lastSuccessAt && Date.parse(row.checkedAt) > Date.parse(value.lastSuccessAt))) return fail();
    ids.add(row.id); paths.add(row.path);
  }
  if (value.snapshots.length && !value.snapshots.some(row => row.checkedAt === value.lastSuccessAt)) return fail();
  return value as unknown as CollectionInfo;
}
