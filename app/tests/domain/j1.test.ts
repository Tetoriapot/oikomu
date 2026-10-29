import { describe, expect, it, vi } from 'vitest';
import { getDataset, validateDataset } from '../../src/data/repository';
import { summarizeDay, placeCandidates } from '../../src/domain/search';
import { calculateWindows } from '../../src/domain/windows';
import { emptyText, isStale, matchDateText } from '../../src/domain/dataStatus';
import { parseRoute } from '../../src/app/router';
import { FAVORITES_KEY, J1_FAVORITES_KEY, loadFavorites, saveFavorites } from '../../src/state/favorites';
import { referenceData } from '../fixtures/j1-reference';

const data = referenceData;
const all = { type: 'all' as const };
describe('J1 official snapshot', () => {
  it('validates the latest live dataset independently of historical behavior fixtures', () => {
    const live = getDataset();
    expect(live.matches).toHaveLength(380);
    expect(live.teams).toHaveLength(20);
    expect(new Set(live.matches.map(match => `${match.homeTeamId}:${match.awayTeamId}`)).size).toBe(380);
    for (const team of live.teams) {
      expect(live.matches.filter(match => match.homeTeamId === team.id)).toHaveLength(19);
      expect(live.matches.filter(match => match.awayTeamId === team.id)).toHaveLength(19);
    }
    expect(live.rules).toMatchObject({ earlyDepartureAfterMinutes: 60, validatedForRealUse: false });
  });
  it('contains all 20 clubs and 380 unique home/away fixtures with official sources', () => {
    expect([data.teams.length, data.matches.length, data.stadiums.length, data.stations.length]).toEqual([20, 380, 22, 39]);
    expect(data.matches.every(m => !m.isDemo && m.sourceId && m.checkedAt)).toBe(true);
    expect(new Set(data.matches.map(m => `${m.homeTeamId}:${m.awayTeamId}`)).size).toBe(380);
    for (const t of data.teams) {
      expect(data.matches.filter(m => m.homeTeamId === t.id)).toHaveLength(19);
      expect(data.matches.filter(m => m.awayTeamId === t.id)).toHaveLength(19);
    }
  });
  it('counts six November 7 games once across nine access stations', () => {
    expect(summarizeDay(data, '2026-11-07', all)).toMatchObject({ count: 6, stationCount: 9 });
    expect(summarizeDay(data, '2026-11-07', { type: 'station', id: 'st-tobitakyu' }).matches.map(m => m.id)).toEqual(['j1-2026-27-fctokyo-kashima']);
  });
  it('uses the national stadium for Kashima home games played there', () => {
    expect(summarizeDay(data, '2026-12-19', { type: 'station', id: 'st-kokuritsu' }).matches.map(m => m.id)).toContain('j1-2026-27-kashima-tokyov');
    expect(summarizeDay(data, '2026-12-19', { type: 'station', id: 'st-kashima-stadium' }).count).toBe(0);
  });
  it('uses Mito’s announced Kasamatsu venue and Tokai station', () => {
    const result = summarizeDay(data, '2026-10-31', { type: 'station', id: 'st-tokai' });
    expect(result.matches[0]).toMatchObject({ stadiumId: 'sd-kasamatsu', homeTeamId: 'team-mito' });
  });
  it('shows candidate dates on each candidate day without a confirmed count or windows', () => {
    const match = data.matches.find(m => m.id === 'j1-2026-27-cosaka-gosaka')!;
    expect(match).toMatchObject({ status: 'date_tbd', candidateDates: ['2027-02-13', '2027-02-14'] });
    for (const date of match.candidateDates!) {
      const result = summarizeDay(data, date, { type: 'stadium', id: 'sd-nagai' });
      expect(result.count).toBe(0); expect(result.pending.map(m => m.id)).toContain(match.id);
      expect(result.rows.flatMap(r => r.windows)).toEqual([]);
    }
    expect(matchDateText(match)).toContain('開催日未定');
  });
  it('keeps conditional alternatives separate from actual games', () => {
    const result = summarizeDay(data, '2027-02-24', { type: 'station', id: 'st-kashiwa' });
    expect(result.conditional.map(m => m.id)).toContain('j1-2026-27-kashiwa-kyoto');
    expect(result.count).toBe(0);
  });
  it('does not infer a venue or station for TBD venues', () => {
    const match = data.matches.find(m => m.status === 'venue_tbd')!;
    expect(summarizeDay(data, match.matchDate, all).venueTbd).toContainEqual(match);
    expect(summarizeDay(data, match.matchDate, { type: 'stadium', id: data.teams.find(t => t.id === match.homeTeamId)!.defaultStadiumId }).matches).not.toContainEqual(match);
  });
  it('does not invent bus travel times', () => {
    const match = data.matches.find(m => m.status === 'scheduled' && m.stadiumId === 'sd-machida')!;
    const access = data.accessLinks.find(l => l.stadiumId === match.stadiumId)!;
    expect(access).toMatchObject({ accessMode: 'bus', walkMinutes: null });
    expect(calculateWindows(match, access, data.rules)).toEqual([]);
  });
  it('distinguishes completed matches, pending fixtures and outside coverage', () => {
    expect(summarizeDay(data, '2026-08-07', all)).toMatchObject({ completed: 2, count: 2 });
    expect(summarizeDay(data, '2026-08-07', all).rows.flatMap(r => r.windows)).toEqual([]);
    expect(summarizeDay(data, '2027-07-01', all).covered).toBe(false);
  });
  it('searches the added stations and current/old stadium aliases', () => {
    expect(placeCandidates(data, 'かめおか')[0].name).toBe('亀岡駅');
    expect(placeCandidates(data, 'カシマ')[0].name).toContain('鹿島');
    expect(placeCandidates(data, 'ヨドコウ')[0].name).toBe('YANMAR HANASAKA STADIUM');
  });
  it('uses today in JST and warns when snapshots become stale', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-04T15:30:00Z'));
    try {
      expect(parseRoute('', data).date).toBe('2026-11-05');
      expect(isStale(data)).toBe(true); expect(emptyText(data)).toContain('更新確認が必要');
      expect(isStale(getDataset('demo'))).toBe(false);
      expect(parseRoute('', getDataset('demo')).date).toBe('2026-11-07');
    } finally { vi.useRealTimers(); }
  });
  it.each(['source', 'candidates', 'bus', 'mixed', 'checkedAt', 'unknownVenue'])('rejects invalid real data: %s', failure => {
    const bad = structuredClone(data);
    if (failure === 'source') bad.matches[0].sourceId = bad.stadiums[0].accessSourceId;
    if (failure === 'candidates') bad.matches.find(m => m.status === 'date_tbd')!.candidateDates = [];
    if (failure === 'bus') bad.accessLinks.find(l => l.accessMode === 'bus')!.walkMinutes = 0;
    if (failure === 'mixed') bad.matches[0].isDemo = true;
    if (failure === 'checkedAt') bad.matches[0].checkedAt = '2027-01-01T00:00:00Z';
    if (failure === 'unknownVenue') bad.matches[0].stadiumId = 'new-unchecked';
    expect(() => validateDataset(bad)).toThrow();
  });
  it('preserves demo favorites and makes a J1 reset survive reload', () => {
    const value = JSON.stringify({ schemaVersion: 1, stationIds: ['st-tama', 'st-kashiwa'] });
    const map = new Map([[FAVORITES_KEY, value], ['other', 'keep']]);
    const storage = { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => { map.set(key, value); }, removeItem: (key: string) => { map.delete(key); } };
    const known = data.stations.map(s => s.id);
    expect(loadFavorites(storage, known, J1_FAVORITES_KEY).ids).toEqual(['st-tama', 'st-kashiwa']);
    saveFavorites(storage, [], true, J1_FAVORITES_KEY);
    expect(loadFavorites(storage, known, J1_FAVORITES_KEY).ids).toEqual([]);
    expect(map.get(FAVORITES_KEY)).toBe(value); expect(map.get('other')).toBe('keep');
  });
});
