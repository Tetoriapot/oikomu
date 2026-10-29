import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildDataset, noteDates, parseDetailNote, parseSchedule } from '../../scripts/j1-source.mjs';
import { validateDataset } from '../../src/data/validate';

const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const raw = read('../../../data/sources/j1-2026-27.json');
const access = read('../../../data/j1-access.json');
const current = read('../../../data/j1.json');
const html = record => `<script>self.__next_f.push(${JSON.stringify([1, '1:' + JSON.stringify(record) + '\n'])})</script>`;
describe('official source import', () => {
  it('rebuilds the checked-in data without changing IDs or dates', () => expect(buildDataset(raw, access, current, validateDataset)).toEqual(current));
  it('retains early-departure rules when importing from a previous v1 snapshot', () => {
    const previous = structuredClone(current);
    previous.rules.version = 'reference-unvalidated-v1'; delete previous.rules.earlyDepartureAfterMinutes;
    const rebuilt = buildDataset(raw, access, previous, validateDataset);
    expect(rebuilt.rules).toMatchObject({ version: 'reference-early-departure-v2', earlyDepartureAfterMinutes: 60 });
    expect(rebuilt.matches).toEqual(previous.matches);
    expect(rebuilt.accessLinks).toEqual(previous.accessLinks);
  });
  it('uses Japan dates for midnight updates and keeps the fixed season searchable after its end', () => {
    const next = structuredClone(raw); next.updatedAt = '2027-07-01T15:00:00.000Z';
    next.matches.forEach(match => { match.checkedAt = next.updatedAt; });
    const data = buildDataset(next, access, current, validateDataset);
    expect(data.meta.referenceDate).toBe('2027-06-30');
    expect(data.sources.filter(source => source.purpose === 'match_schedule').every(source => source.checkedOn === '2027-07-02')).toBe(true);
    expect(data.meta.updatedAt).toBe('2027-07-01T15:00:00.000Z');
  });
  it('rejects empty, truncated, unknown venue and duplicate sources', () => {
    for (const change of [r => { r.matches = []; }, r => { r.matches.pop(); }, r => { r.matches[0].stadium = '未確認会場'; }, r => { r.matches[0] = r.matches[1]; }]) {
      const bad = structuredClone(raw); change(bad);
      expect(() => buildDataset(bad, access, current, validateDataset)).toThrow();
    }
  });
  it('retains a stable ID and history when date-dependent official IDs change', () => {
    const next = structuredClone(raw); next.updatedAt = '2026-10-30T02:00:00Z';
    const m = next.matches.find(m => m.home === '鹿島アントラーズ' && m.away === '東京ヴェルディ');
    m.date = '2026-12-20'; m.officialId = '2026122001'; m.url = 'https://www.jleague.jp/match/j1/2026/122001/'; m.checkedAt = next.updatedAt;
    const data = buildDataset(next, access, current, validateDataset);
    expect(data.matches.find(m => m.id === 'j1-2026-27-kashima-tokyov').history.at(-1)).toMatchObject({ field: 'matchDate', fromValue: '2026-12-19', toValue: '2026-12-20' });
  });
  it('separates the main date candidates and conditional alternatives', () => {
    expect(noteDates('※３／１３（土） ｏｒ ３／１４（日） ※ＡＦＣの試合日程により、２／２４（水）に開催する可能性があります', '2026-27')).toEqual({ candidateDates: ['2027-03-13', '2027-03-14'], conditionalDates: ['2027-02-24'] });
  });
  it('fails closed when detail notes disappear or contradict', () => {
    expect(parseDetailNote(html({ afterCanceledInfo: '' }))).toBe('');
    expect(parseDetailNote(html({ afterCanceledInfo: '※２／１３（土） ｏｒ ２／１４（日）' }))).toContain('ｏｒ');
    expect(() => parseDetailNote('<script>alert(1)</script>')).toThrow();
    expect(() => parseDetailNote(html([{ afterCanceledInfo: 'a' }, { afterCanceledInfo: 'b' }]))).toThrow();
  });
  it('extracts only J1 matches from server-rendered JSON and rejects the 250-row cap', () => {
    const group = { gameKindId: 2, leagueName: 'j1', matchDate: '$D2026-11-07T00:00:00.000Z', seasonText: '第14節', matches: [{ id: '2026110701', state: 'ticket', time: '15:00', detailHref: '/match/j1/2026/110701', homeTeam: { fullName: 'ＦＣ東京' }, awayTeam: { fullName: '鹿島アントラーズ' }, stadiumFullName: '味の素スタジアム' }] };
    expect(parseSchedule(html([group, { ...group, gameKindId: 6, leagueName: 'j2' }]))).toHaveLength(1);
    expect(() => parseSchedule(html({ ...group, matches: Array.from({ length: 250 }, (_, i) => ({ ...group.matches[0], id: String(i) })) }))).toThrow('取得上限');
  });
});
