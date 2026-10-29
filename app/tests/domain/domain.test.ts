import { describe, expect, it } from 'vitest';
import cases from '../../../contracts/logic-cases.json';
import seed from '../../../data/demo.json';
import { getDataset, safeAccessUrl, validateDataset } from '../../src/data/repository';
import { addDays, calendarDays, moveMonth, validDate } from '../../src/domain/dates';
import { previousSnapshots } from '../../src/domain/changes';
import { calculateWindows, clipToDay, mergeWindows } from '../../src/domain/windows';
import { placeCandidates, summarizeDay } from '../../src/domain/search';
import type { Match, MatchStatus, Place, TimeWindow } from '../../src/domain/types';

const data = getDataset('demo');
describe('supplied logic contract', () => {
  for (const c of cases.cases) it(c.id, () => {
    if (c.kind === 'calculate') {
      const match: Match = { ...data.matches[0], matchDate: c.date!, kickoffLocalTime: c.time ?? null, status: c.status as MatchStatus };
      expect(calculateWindows(match, { ...data.accessLinks[0], demoWalkMinutes: c.walk! }, data.rules).map(w => [w.kind, w.start, w.end])).toEqual(c.expected);
    } else if (c.kind === 'clip') {
      const window = clipToDay({ kind: 'arrival', start: c.start!, end: c.end!, matchIds: ['x'], ruleVersion: 'demo-v1' }, c.date!);
      expect(window ? [window.start, window.end] : null).toEqual(c.expected);
    } else {
      const windows = c.windows!.map(w => ({ ...w, kind: w.kind as TimeWindow['kind'], ruleVersion: 'demo-v1' }));
      expect(mergeWindows(windows).map(({ ruleVersion: _, ...w }) => w)).toEqual(c.expected);
    }
  });
});
describe('data validation', () => {
  it('loads every record', () => expect([data.stadiums.length, data.stations.length, data.teams.length, data.matches.length]).toEqual([5, 7, 8, 24]));
  it.each(['duplicate', 'reference', 'status', 'coverage', 'history', 'shape', 'url'])('rejects %s', (failure) => {
    const broken = structuredClone(seed);
    if (failure === 'duplicate') broken.matches[1].id = broken.matches[0].id;
    if (failure === 'reference') broken.matches[0].stadiumId = 'unknown';
    if (failure === 'status') broken.matches[0].kickoffLocalTime = null;
    if (failure === 'coverage') broken.coverage[0].endDate = '2026-11-01';
    if (failure === 'history') broken.matches[11].history[0].toValue = 'sd-ajino';
    if (failure === 'url') broken.stadiums[0].accessUrl = 'javascript:alert(1)';
    expect(() => validateDataset(failure === 'shape' ? {} : broken)).toThrow();
  });
  it('only permits the official HTTPS domains', () => {
    expect(safeAccessUrl('https://www.ajinomotostadium.com/access/')).toBe(true);
    expect(safeAccessUrl('https://www.ajinomotostadium.com.attacker.test')).toBe(false);
  });
});
describe('search and changes', () => {
  const station = (id: string): Place => ({ type: 'station', id: `st-${id}` });
  it('deduplicates November 7', () => {
    const s = summarizeDay(data, '2026-11-07', { type: 'all' });
    expect([s.count, s.stationCount]).toEqual([3, 5]);
    expect(s.matches.map(m => m.id)).toEqual(['m02', 'm01', 'm03']);
  });
  it('filters the actual venue and region', () => {
    expect(summarizeDay(data, '2026-11-07', station('tobitakyu')).matches.map(m => m.id)).toEqual(['m01']);
    const s = summarizeDay(data, '2026-11-07', { type: 'region', id: 'tokyo' });
    expect([s.count, s.stationCount]).toEqual([1, 2]);
  });
  it('normalizes half width kana and aliases', () => {
    expect(placeCandidates(data, 'ﾄﾋﾞﾀｷｭｳ')[0].name).toBe('飛田給駅');
    expect(placeCandidates(data, '味スタ')[0].name).toBe('味の素スタジアム');
    expect(placeCandidates(data, '新宿')).toEqual([]);
  });
  it.each([
    ['2026-11-21', 'tobitakyu', 1, 0, 0], ['2026-11-22', 'urawamisono', 0, 1, 0],
    ['2026-11-23', 'soga', 0, 1, 0], ['2026-11-28', 'kozukue', 1, 0, 2],
    ['2026-11-28', 'tobitakyu', 0, 1, 0], ['2026-12-05', 'kashiwa', 0, 1, 0],
    ['2026-12-06', 'kashiwa', 1, 0, 2],
  ])('%s %s status and windows', (date, id, count, notices, windows) => {
    const s = summarizeDay(data, date as string, station(id as string));
    expect([s.count, s.notices.length, s.rows.flatMap(r => r.windows).length]).toEqual([count, notices, windows]);
  });
  it('keeps venue TBD independent of home stadium', () => {
    expect(summarizeDay(data, '2026-12-20', { type: 'all' }).venueTbd.map(m => m.id)).toEqual(['m24']);
    expect(summarizeDay(data, '2026-12-20', station('tobitakyu')).venueTbd).toEqual([]);
  });
  it('distinguishes empty and outside coverage', () => {
    expect(summarizeDay(data, '2026-11-09', { type: 'all' })).toMatchObject({ covered: true, count: 0 });
    expect(summarizeDay(data, '2027-01-07', { type: 'all' })).toMatchObject({ covered: false, count: 0 });
  });
  it('reverses date and venue changes in order', () => {
    const match = { ...data.matches[11], matchDate: '2026-11-29', history: [...data.matches[11].history, { field: 'matchDate' as const, fromValue: '2026-11-28', toValue: '2026-11-29', changedAt: '2026-11-21T12:00:00+09:00', note: 'サンプル上の変更' }] };
    expect(previousSnapshots(match).map(s => [s.matchDate, s.stadiumId])).toEqual([['2026-11-28', 'sd-nissan'], ['2026-11-28', 'sd-ajino']]);
  });
  it('includes clipped previous-day windows without counting a new match', () => {
    const late = structuredClone(data); late.matches[0].kickoffLocalTime = '23:30';
    const s = summarizeDay(late, '2026-11-08', station('tobitakyu'));
    expect(s.count).toBe(0); expect(s.previousDayReturn).toBe(true); expect(s.rows[0].windows[0].start).toBe('2026-11-08T01:25:00+09:00');
  });
});
describe('JST calendar', () => {
  it('validates real dates', () => { expect(validDate('2026-02-30')).toBe(false); expect(validDate('2028-02-29')).toBe(true); });
  it('builds 42 cells beginning Monday', () => { const days = calendarDays('2026-11-07'); expect(days).toHaveLength(42); expect(days[0]).toBe('2026-10-26'); expect(days[41]).toBe('2026-12-06'); });
  it('moves months to the first and handles year boundaries', () => { expect(moveMonth('2026-12-31', 1)).toBe('2027-01-01'); expect(moveMonth('2026-11-07', -1)).toBe('2026-10-01'); expect(addDays('2026-12-31', 1)).toBe('2027-01-01'); });
  it('moves forward from the first of the month', () => expect(moveMonth('2026-12-01', 1)).toBe('2027-01-01'));
});
