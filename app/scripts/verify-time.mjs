import { readFile } from 'node:fs/promises';
import { validateTimeEvidence } from '../src/data/validateTimeEvidence.ts';
import { buildTimeValidation } from '../src/domain/timeValidation.ts';

const read = async name => JSON.parse(await readFile(new URL(`../../data/${name}`, import.meta.url), 'utf8'));
const evidence = validateTimeEvidence(await read('time-evidence.json'));
const data = await read('j1.json');
console.log(JSON.stringify(buildTimeValidation(data.rules, data.accessLinks, evidence), null, 2));
