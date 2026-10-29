import type { Change, DemoDataset, Match } from './types';

export interface ChangeNotice {
  match: Match;
  date: string;
  stadiumId: string | null;
  kind: 'postponed' | 'cancelled' | Change['field'];
  change?: Change;
}
export function previousSnapshots(match: Match) {
  let snapshot = { matchDate: match.matchDate, stadiumId: match.stadiumId, kickoffLocalTime: match.kickoffLocalTime };
  return [...match.history].reverse().map(change => {
    snapshot = { ...snapshot, [change.field]: change.fromValue };
    return { ...snapshot, change };
  });
}
export function buildChangeNotices(data: DemoDataset): ChangeNotice[] {
  return data.matches.flatMap(match => {
    const notices: ChangeNotice[] = previousSnapshots(match).map(snapshot => ({
      match, date: snapshot.matchDate, stadiumId: snapshot.stadiumId, kind: snapshot.change.field, change: snapshot.change,
    }));
    if (match.status === 'postponed' || match.status === 'cancelled') notices.push({ match, date: match.matchDate, stadiumId: match.stadiumId, kind: match.status });
    return notices;
  });
}
