import { useApp } from '../app/context';
import { routeUrl } from '../app/router';
import type { StationResult } from '../domain/search';
import { TimeWindows } from './TimeWindows';
import { MatchCard } from './MatchCard';
import { Icon } from './Icon';
import { coverageText, emptyText, isDemo } from '../domain/dataStatus';
import { FavoriteButton } from './FavoriteButton';

export function StationCard({ result, outside = false, hasDateCandidates = false }: { result: StationResult; outside?: boolean; hasDateCandidates?: boolean }) {
  const { data, route } = useApp();
  return <article className="station-card" data-station={result.station.id}>
    <div className="station-heading"><div className="station-title"><span className="station-icon"><Icon name="train" /></span><div><p className="small muted">{data.regions.find(r => r.id === result.station.regionId)?.name}</p><h3><a href={routeUrl(`/stations/${result.station.id}`, route)}>{result.station.name}<span className="station-suffix">駅</span></a></h3></div></div><FavoriteButton station={result.station} /></div>
    {result.matches.map(match => <MatchCard key={match.id} match={match} showDate={match.matchDate !== route.date} />)}
    {!result.matches.length && <p className="notice-text">{outside ? `${isDemo(data) ? 'デモ' : ''}収録範囲外です（${coverageText(data)}）。` : hasDateCandidates ? 'この日が開催候補の試合があります。候補日と条件を確認してください。' : result.notices.length ? '変更のお知らせがあります。' : emptyText(data)}</p>}
    {!result.matches.length && result.notices.map((n, i) => <p className="small" key={i}><a href={routeUrl(`/matches/${n.match.id}`, route)}>変更のお知らせを見る →</a></p>)}
    {!isDemo(data) && <div className="access-summary">{data.accessLinks.filter(l => l.stationId === result.station.id && result.matches.some(m => m.stadiumId === l.stadiumId)).map(l => <p className="small muted" key={l.stadiumId}>{l.accessMode === 'bus' ? 'バス利用' : '徒歩アクセス'} · {l.accessNote}</p>)}</div>}
    {!isDemo(data) && result.matches.some(m => m.status === 'scheduled') && !result.windows.length && <p className="small muted">移動時間が未収録、またはバス利用のため、参考時間帯は計算していません。</p>}
    <TimeWindows windows={result.windows} date={route.date} />
    <div className="card-footer"><span className="small muted">{result.notices.length && !result.matches.length ? '変更案内のみ' : '日本時間（JST）'}</span><a href={routeUrl(`/stations/${result.station.id}`, route)}>駅の詳細を見る <Icon name="arrow" /></a></div>
  </article>;
}
