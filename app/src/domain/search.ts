import type { DemoDataset, Match, Place, Station, TimeWindow } from './types';
import { buildChangeNotices, type ChangeNotice } from './changes';
import { calculateWindows, clipToDay, mergeWindows } from './windows';
import { addDays } from './dates';

export const normalizeQuery = (query: string) => query.normalize('NFKC').trim().toLowerCase().replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
export const placeKey = (place: Place) => place.type === 'all' ? 'all' : `${place.type}:${place.id}`;
export function placeLabel(data: DemoDataset, place: Place): string {
  if (place.type === 'all') return 'すべての対象地域';
  const rows = place.type === 'station' ? data.stations : place.type === 'stadium' ? data.stadiums : data.regions;
  return (rows.find(x => x.id === place.id)?.name ?? '') + (place.type === 'station' ? '駅' : '');
}
export function placeCandidates(data: DemoDataset, query: string) {
  const q = normalizeQuery(query);
  return [
    ...data.stations.map(x => ({ place: { type: 'station', id: x.id } as Place, name: x.name + '駅', kind: '駅', terms: [x.name, x.kana, ...x.aliases] })),
    ...data.stadiums.map(x => ({ place: { type: 'stadium', id: x.id } as Place, name: x.name, kind: '会場', terms: [x.name, ...x.aliases] })),
    ...data.regions.map(x => ({ place: { type: 'region', id: x.id } as Place, name: x.name, kind: '地域', terms: [x.name, ...x.aliases] })),
  ].filter(x => !q || x.terms.some(t => normalizeQuery(t).includes(q))).slice(0, 8);
}
export function expandPlace(data: DemoDataset, place: Place) {
  const links = data.accessLinks.filter(link => {
    if (place.type === 'station') return link.stationId === place.id;
    if (place.type === 'stadium') return link.stadiumId === place.id;
    if (place.type === 'region') return data.stadiums.some(s => s.id === link.stadiumId && s.regionId === place.id);
    return true;
  });
  return { links, stadiumIds: new Set(links.map(l => l.stadiumId)), stationIds: new Set(links.map(l => l.stationId)) };
}
export const sortMatches = (a: Match, b: Match) => a.matchDate.localeCompare(b.matchDate) || (a.kickoffLocalTime ?? '99:99').localeCompare(b.kickoffLocalTime ?? '99:99') || a.id.localeCompare(b.id);
export const isActive = (match: Match) => match.status === 'scheduled' || match.status === 'time_tbd' || match.status === 'completed';
export function filterMatches(data: DemoDataset, date: string, place: Place) {
  const scope = expandPlace(data, place);
  const earliest = addDays(date, -1), latest = addDays(date, 1);
  return data.matches.filter(match => match.matchDate >= earliest && match.matchDate <= latest && isActive(match) && scope.stadiumIds.has(match.stadiumId ?? '') &&
    data.coverage.some(c => c.stadiumId === match.stadiumId && c.startDate <= date && date <= c.endDate) &&
    (match.matchDate === date || scope.links.some(link => calculateWindows(match, link, data.rules).some(w => clipToDay(w, date))))).sort(sortMatches);
}
export interface StationResult { station: Station; matches: Match[]; windows: TimeWindow[]; notices: ChangeNotice[] }
export function summarizeDay(data: DemoDataset, date: string, place: Place) {
  const scope = expandPlace(data, place);
  const coveredIds = new Set(data.coverage.filter(c => scope.stadiumIds.has(c.stadiumId) && c.startDate <= date && date <= c.endDate).map(c => c.stadiumId));
  const covered = coveredIds.size > 0;
  const matches = covered ? filterMatches(data, date, place) : [];
  const notices = covered ? buildChangeNotices(data).filter(n => n.date === date && n.stadiumId && coveredIds.has(n.stadiumId)) : [];
  const rows: StationResult[] = data.stations.filter(s => scope.stationIds.has(s.id)).map(station => {
    const links = scope.links.filter(l => l.stationId === station.id && coveredIds.has(l.stadiumId));
    const relevant = matches.filter(m => links.some(l => l.stadiumId === m.stadiumId && (m.matchDate === date || calculateWindows(m, l, data.rules).some(w => clipToDay(w, date)))));
    const windows = mergeWindows(relevant.flatMap(m => links.flatMap(l => calculateWindows(m, l, data.rules))).map(w => clipToDay(w, date)).filter((w): w is TimeWindow => w !== null));
    return { station, matches: relevant, windows, notices: notices.filter(n => links.some(l => l.stadiumId === n.stadiumId)) };
  }).filter(row => row.matches.length || row.notices.length);
  rows.sort((a, b) => (a.matches[0]?.kickoffLocalTime ?? '99:99').localeCompare(b.matches[0]?.kickoffLocalTime ?? '99:99') || a.station.sortOrder - b.station.sortOrder);
  const venueTbd = covered && place.type === 'all' ? data.matches.filter(m => m.status === 'venue_tbd' && m.matchDate === date) : [];
  const pending = covered ? data.matches.filter(m => m.status === 'date_tbd' && m.candidateDates?.includes(date) && (scope.stadiumIds.has(m.stadiumId ?? '') || (place.type === 'all' && !m.stadiumId))) : [];
  const conditional = covered ? data.matches.filter(m => m.conditionalDates?.includes(date) && m.matchDate !== date && !m.candidateDates?.includes(date) && (scope.stadiumIds.has(m.stadiumId ?? '') || (place.type === 'all' && !m.stadiumId))) : [];
  return {
    covered, rows, matches, notices, venueTbd, pending, conditional,
    count: new Set(matches.filter(m => m.matchDate === date).map(m => m.id)).size,
    stationCount: rows.filter(r => r.matches.length).length,
    timedStationCount: rows.filter(r => r.windows.length).length,
    timeTbd: matches.filter(m => m.matchDate === date && m.status === 'time_tbd').length,
    completed: matches.filter(m => m.matchDate === date && m.status === 'completed').length,
    previousDayReturn: rows.some(r => r.windows.some(w => w.kind === 'departure' && w.matchIds.some(id => matches.some(m => m.id === id && m.matchDate < date)))),
    hasChanges: notices.length > 0 || matches.some(m => m.history.length > 0),
  };
}
export function upcomingMatches(data: DemoDataset, stationId: string, date: string, limit = 5) {
  const scope = expandPlace(data, { type: 'station', id: stationId });
  return data.matches.filter(m => m.status !== 'completed' && (isActive(m) || m.status === 'date_tbd') && (m.matchDate >= date || m.candidateDates?.some(d => d >= date)) && scope.stadiumIds.has(m.stadiumId ?? '')).sort(sortMatches).slice(0, limit);
}
