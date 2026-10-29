import { useApp } from '../app/context';
import { routeUrl } from '../app/router';
import { useFavorites } from '../state/favorites';
import { summarizeDay, upcomingMatches } from '../domain/search';
import { StationCard } from '../components/StationCard';
import { MatchCard } from '../components/MatchCard';
import { DateControl } from '../components/DateControl';
import { Icon } from '../components/Icon';

export function FavoritesPage() {
  const { data, route } = useApp();
  const { ids } = useFavorites();
  return <><div className="page-intro"><div><p className="eyebrow">登録順に表示</p><h1 tabIndex={-1}>お気に入りの駅</h1><p className="muted">お気に入りは、この端末のブラウザーに保存されます。</p></div><span className="selection-chip">{ids.length} / {data.stations.length}駅</span></div><DateControl key={route.date} />{!ids.length ? <div className="empty-state"><Icon name="star" /><h2>お気に入りの駅はありません</h2><p>駅の星ボタンで登録すると、ここで予定を確認できます。</p><a className="button primary" href={routeUrl('/search', route)}>駅を探す</a></div> : <div className="favorites-grid">{ids.map(id => {
    const station = data.stations.find(s => s.id === id)!;
    const summary = summarizeDay(data, route.date, { type: 'station', id });
    const next = upcomingMatches(data, id, route.date, 1)[0];
    return <section key={id}><StationCard outside={!summary.covered} hasDateCandidates={!!(summary.pending.length || summary.conditional.length)} result={summary.rows[0] ?? { station, matches: [], windows: [], notices: [] }} />{summary.pending.length > 0 && <div className="next-match"><h2>この日が開催候補の試合</h2>{summary.pending.map(match => <MatchCard key={match.id} match={match} showDate />)}</div>}{summary.conditional.length > 0 && <div className="next-match"><h2>条件によりこの日に変更される可能性がある試合</h2>{summary.conditional.map(match => <MatchCard key={match.id} match={match} showDate />)}</div>}<div className="next-match"><h2>次の予定</h2>{next ? <MatchCard match={next} showDate /> : <p className="small muted">収録期間内に次の予定はありません。</p>}</div></section>;
  })}</div>}</>;
}
