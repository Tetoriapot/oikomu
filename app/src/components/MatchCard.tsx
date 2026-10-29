import { useApp } from '../app/context';
import { routeUrl } from '../app/router';
import type { Match } from '../domain/types';
import { matchDateText } from '../domain/dataStatus';

export const statusText = {
  scheduled: '開催予定', time_tbd: '開始時刻未定・時間帯を計算できません',
  venue_tbd: '会場未定・対象駅をまだ表示できません', postponed: '延期・新しい日程は未定です', cancelled: '中止・注意時間帯は表示しません',
  date_tbd: '開催日未定・候補日の段階です', completed: '試合終了',
};
export function MatchCard({ match, showDate = false, link = true }: { match: Match; showDate?: boolean; link?: boolean }) {
  const { data, route } = useApp();
  const title = `${data.teams.find(t => t.id === match.homeTeamId)?.name} vs ${data.teams.find(t => t.id === match.awayTeamId)?.name}`;
  return <div className="match-card">
    <div className="fixture-meta"><span className="tag">{match.isDemo ? 'サンプル試合' : `J1 第${match.round}節`}</span>{(showDate || match.status === 'date_tbd') && <span>{matchDateText(match)}</span>}<strong>{match.status === 'completed' ? `試合終了（${match.kickoffLocalTime} 開始）` : match.kickoffLocalTime ? `${match.kickoffLocalTime} 開始` : statusText[match.status]}</strong>{match.history.length > 0 && <span className="change-tag">{match.history.some(h => h.field === 'stadiumId') ? '会場変更' : match.history.some(h => h.field === 'matchDate') ? '日程変更' : '時刻変更'}</span>}</div>
    <p className="match-title">{link ? <a href={routeUrl(`/matches/${match.id}`, route)}>{title}<span className="visually-hidden">の詳細</span></a> : title}</p>
    {match.stadiumId && <p className="small muted">{data.stadiums.find(s => s.id === match.stadiumId)?.name}</p>}
    {!match.isDemo && match.note && <p className="small schedule-note">{match.note}</p>}
  </div>;
}
