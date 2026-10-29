import { describe, expect, it } from 'vitest';
import { parseRoute, routeUrl } from '../../src/app/router';
import { getDataset } from '../../src/data/repository';
import { FAVORITES_KEY, loadFavorites, parseFavorites, saveFavorites } from '../../src/state/favorites';

const data = getDataset('demo');
const known = data.stations.map(s => s.id);
describe('URL normalization and context', () => {
  it('uses the demo reference independently of current time', () => expect(parseRoute('', data)).toMatchObject({ date: '2026-11-07', month: '2026-11', view: 'list', place: { type: 'all' } }));
  it('normalizes impossible dates, places and views', () => {
    const route = parseRoute('#/search?date=2026-02-30&place=station:unknown&view=invalid', data);
    expect(route).toMatchObject({ date: '2026-11-07', place: { type: 'all' }, view: 'list' });
    expect(route.notice).toContain('日付');
  });
  it('uses date month and whitelists parameters', () => {
    const route = parseRoute('#/search?date=2026-12-06&month=2027-01&place=station:st-kashiwa&view=calendar&unsafe=x', data);
    expect(route.month).toBe('2026-12');
    expect(routeUrl(route.path, route)).toBe('#/search?date=2026-12-06&place=station%3Ast-kashiwa&view=calendar&month=2026-12');
  });
  it('round trips all screen context', () => {
    const route = parseRoute('#/search?date=2026-11-28&place=region:tokyo&view=calendar', data);
    expect(parseRoute(routeUrl('/matches/m12', route), data)).toMatchObject({ ...route, path: '/matches/m12' });
  });
  it('does not replace an unknown route', () => expect(parseRoute('#/stations/unknown', data).path).toBe('/stations/unknown'));
});
describe('favorites', () => {
  it('removes unknown and duplicate IDs while preserving order', () => expect(parseFavorites(JSON.stringify({ schemaVersion: 1, stationIds: ['st-tama', 'unknown', 'st-tobitakyu', 'st-tama'] }), known).ids).toEqual(['st-tama', 'st-tobitakyu']));
  it.each(['{', '{}', '{"schemaVersion":1,"stationIds":"invalid"}', '{"schemaVersion":2,"stationIds":[]}'])('handles corrupt storage %s', value => expect(parseFavorites(value, known)).toEqual({ ids: [], corrupt: true }));
  it('handles unavailable storage', () => {
    const blocked = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); }, removeItem: () => { throw new Error('denied'); } };
    expect(loadFavorites(blocked, known).message).toContain('開いている間だけ');
    expect(saveFavorites(blocked, ['st-tama'])).toBe(false);
    expect(saveFavorites(blocked, [], true)).toBe(false);
  });
  it('saves, restores and removes only its own key', () => {
    const map = new Map<string, string>([['unrelated', 'preserve']]);
    const storage = { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => { map.set(key, value); }, removeItem: (key: string) => { map.delete(key); } };
    expect(saveFavorites(storage, ['st-tama', 'st-tobitakyu'])).toBe(true);
    expect(loadFavorites(storage, known).ids).toEqual(['st-tama', 'st-tobitakyu']);
    saveFavorites(storage, [], true);
    expect(map.has(FAVORITES_KEY)).toBe(false); expect(map.get('unrelated')).toBe('preserve');
  });
});
