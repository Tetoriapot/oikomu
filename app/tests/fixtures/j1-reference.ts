import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { validateDataset } from '../../src/data/validate';

// Behavior tests use the immutable release snapshot. Live imports have separate checks.
const archive = JSON.parse(gunzipSync(readFileSync(new URL('../../../data/history/j1-20261029T131352310Z.json.gz', import.meta.url))).toString('utf8'));
export const referenceData = validateDataset(archive.dataset);
export const referenceRaw = archive.raw;
