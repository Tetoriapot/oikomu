import { describe, expect, it } from 'vitest';
import { getDataset, validateDataset } from '../../src/data/repository';
import { calculateWindows, clipToDay, mergeWindows } from '../../src/domain/windows';
import { summarizeDay } from '../../src/domain/search';
import { validateTimeEvidence } from '../../src/data/validateTimeEvidence';
import evidence from '../../../data/time-evidence.json';
import { referenceData } from '../fixtures/j1-reference';

const data = { ...referenceData, rules: getDataset().rules };
const match = data.matches.find(item => item.id === 'j1-2026-27-fctokyo-kashima')!;
const link = data.accessLinks.find(item => item.stadiumId === 'sd-ajino' && item.stationId === 'st-tobitakyu')!;

describe('J1 early departures', () => {
  it('includes early departures without altering match duration or arrival windows', () => {
    expect(match.kickoffLocalTime).toBe('15:00');
    expect(calculateWindows(match, link, data.rules).map(item => [item.start, item.end])).toEqual([
      ['2026-11-07T12:30:00+09:00', '2026-11-07T14:45:00+09:00'],
      ['2026-11-07T16:05:00+09:00', '2026-11-07T18:45:00+09:00'],
    ]);
    expect(data.rules).toMatchObject({ earlyDepartureAfterMinutes: 60, matchEndEarliestAfterMinutes: 110, matchEndLatestAfterMinutes: 130, departureTailMinutes: 90, validatedForRealUse: false });
  });
  it('preserves every previously displayed J1 minute and extends each computable start by 50 minutes', () => {
    let compared = 0;
    const previousRules = { ...data.rules, earlyDepartureAfterMinutes: undefined };
    for (const fixture of data.matches) for (const access of data.accessLinks) {
      const old = calculateWindows(fixture, access, previousRules);
      const current = calculateWindows(fixture, access, data.rules);
      if (!old.length) { expect(current).toEqual([]); continue; }
      compared++;
      expect(current[0].start).toBe(old[0].start); expect(current[0].end).toBe(old[0].end);
      expect(current[1].end).toBe(old[1].end);
      expect(Date.parse(old[1].start) - Date.parse(current[1].start)).toBe(50 * 60_000);
    }
    expect(compared).toBeGreaterThan(50);
  });
  it('loads old rules without the added field and preserves the former departure time', () => {
    const legacy = structuredClone(data); delete legacy.rules.earlyDepartureAfterMinutes;
    expect(validateDataset(legacy)).toBe(legacy);
    expect(calculateWindows(match, link, legacy.rules)[1].start).toBe('2026-11-07T16:55:00+09:00');
  });
  it('does not apply the J1 field to demo matches', () => {
    const demo = getDataset('demo');
    const fixture = demo.matches.find(item => item.id === 'm01')!;
    const access = demo.accessLinks.find(item => item.stadiumId === fixture.stadiumId && item.stationId === 'st-tobitakyu')!;
    expect(calculateWindows(fixture, access, { ...demo.rules, earlyDepartureAfterMinutes: 60 })).toEqual(calculateWindows(fixture, access, demo.rules));
    expect(calculateWindows(fixture, access, demo.rules)[1].start).toBe('2026-11-07T16:55:00+09:00');
  });
  it('uses the station walking duration for a night match', () => {
    const tama = data.accessLinks.find(item => item.stadiumId === 'sd-ajino' && item.stationId === 'st-tama')!;
    expect(calculateWindows({ ...match, kickoffLocalTime: '19:00' }, link, data.rules)[1].start).toBe('2026-11-07T20:05:00+09:00');
    expect(calculateWindows({ ...match, kickoffLocalTime: '19:00' }, tama, data.rules)[1].start).toBe('2026-11-07T20:20:00+09:00');
  });
  it('clips an early departure across midnight and retains the exclusive end', () => {
    const window = calculateWindows({ ...match, kickoffLocalTime: '22:30' }, link, data.rules)[1];
    expect(window).toMatchObject({ start: '2026-11-07T23:35:00+09:00', end: '2026-11-08T02:15:00+09:00' });
    expect(clipToDay(window, '2026-11-07')).toMatchObject({ start: window.start, end: '2026-11-08T00:00:00+09:00' });
    expect(clipToDay(window, '2026-11-08')).toMatchObject({ start: '2026-11-08T00:00:00+09:00', end: window.end });
    const midnightEnd = calculateWindows({ ...match, kickoffLocalTime: '20:15' }, link, data.rules)[1];
    expect(clipToDay(midnightEnd, '2026-11-08')).toBeNull();
  });
  it('merges extended returns while retaining both contributing matches', () => {
    const first = calculateWindows(match, link, data.rules)[1];
    const second = calculateWindows({ ...match, id: 'second', kickoffLocalTime: '17:00' }, link, data.rules)[1];
    expect(mergeWindows([first, second])).toEqual([{ ...first, end: '2026-11-07T20:45:00+09:00', matchIds: [match.id, 'second'] }]);
  });
  it('keeps previous-day returns out of the new day match count', () => {
    const late = structuredClone(data); late.matches = [{ ...match, kickoffLocalTime: '22:30' }];
    const summary = summarizeDay(late, '2026-11-08', { type: 'station', id: link.stationId });
    expect(summary.count).toBe(0); expect(summary.previousDayReturn).toBe(true);
    expect(summary.rows[0].windows[0]).toMatchObject({ start: '2026-11-08T00:00:00+09:00', end: '2026-11-08T02:15:00+09:00' });
  });
  it.each([-1, 111, 60.5, Number.NaN, Number.POSITIVE_INFINITY, null, '60'])('rejects an invalid early-departure coefficient: %s', value => {
    const bad = structuredClone(data); Object.assign(bad.rules, { earlyDepartureAfterMinutes: value });
    expect(() => validateDataset(bad)).toThrow('早期退場');
    const badEvidence = structuredClone(evidence); Object.assign(badEvidence.reviewedRules, { earlyDepartureAfterMinutes: value });
    expect(() => validateTimeEvidence(badEvidence)).toThrow();
  });
});
