import { useApp } from '../app/context';
import { routeUrl } from '../app/router';
import { summarizeDay, upcomingMatches } from '../domain/search';
import { dateLabel } from '../domain/dates';
import { FavoriteButton } from '../components/FavoriteButton';
import { DateControl } from '../components/DateControl';
import { DayResults } from '../components/DayResults';
import { MatchCard } from '../components/MatchCard';
import { ShareButton } from '../components/ShareButton';
import { NotFoundPage } from './NotFoundPage';

export function StationPage({ id }: { id: string }) {
  const { data, route } = useApp();
  const station = data.stations.find(s => s.id === id);
  if (!station) return <NotFoundPage />;
  const stadiums = data.stadiums.filter(s => data.accessLinks.some(l => l.stadiumId === s.id && l.stationId === id));
  const next = upcomingMatches(data, id, route.date);
  return <>
    <a className="back-link" href={routeUrl('/search', route)}>← 検索結果に戻る</a>
    <div className="detail-heading"><div><p className="eyebrow">{data.regions.find(r => r.id === station.regionId)?.name} · {station.kana}</p><h1 tabIndex={-1}>{station.name}駅</h1></div><FavoriteButton station={station} /></div>
    <div className="detail-grid"><section><DateControl key={route.date} /><div className="section-heading"><h2>{dateLabel(route.date)}の予定</h2><a href={routeUrl('/search', { ...route, place: { type: 'station', id }, view: 'calendar' })}>この駅の月間カレンダー</a></div><DayResults summary={summarizeDay(data, route.date, { type: 'station', id })} />
      <section className="panel spaced"><h2>次の予定</h2><p className="muted small">選択日以降の開催予定を最大5件表示します。{data.meta.mode === 'j1' && '日程未定の試合は候補日を表示します。'}</p>{next.length ? next.map(m => <MatchCard key={m.id} match={m} showDate />) : <p>収録期間内に次の予定はありません。</p>}</section>
    </section><aside><section className="panel"><h2>関連する会場</h2>{stadiums.map(s => <div className="venue-block" key={s.id}><h3>{s.name}</h3><a href={s.accessUrl} target="_blank" rel="noopener noreferrer">会場の公式アクセス ↗</a><p className="small muted">{data.meta.mode === 'demo' ? '場所の参考情報です。サンプル試合の日程を示すものではありません。' : data.accessLinks.find(l => l.stadiumId === s.id && l.stationId === id)?.accessNote}</p><h3 className="small">別のアクセス駅</h3><div className="access-stations">{data.accessLinks.filter(l => l.stadiumId === s.id && l.stationId !== id).map(l => <a key={l.stationId} href={routeUrl(`/stations/${l.stationId}`, route)}>{data.stations.find(st => st.id === l.stationId)?.name}駅 →</a>)}{!data.accessLinks.some(l => l.stadiumId === s.id && l.stationId !== id) && <p className="small muted">収録したアクセス駅は、この駅のみです。</p>}</div></div>)}</section><ShareButton /></aside></div>
  </>;
}
