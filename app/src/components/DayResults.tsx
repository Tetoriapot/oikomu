import { useApp } from '../app/context';
import { routeUrl } from '../app/router';
import type { summarizeDay } from '../domain/search';
import { dateLabel } from '../domain/dates';
import { StationCard } from './StationCard';
import { MatchCard } from './MatchCard';
import { Icon } from './Icon';
import { coverageText, emptyText, isDemo } from '../domain/dataStatus';

export function DayResults({ summary }: { summary: ReturnType<typeof summarizeDay> }) {
  const { data, route } = useApp();
  const venueName = (id: string | null) => data.stadiums.find(s => s.id === id)?.name ?? '会場未定';
  if (!summary.covered) return <div className="empty-state"><Icon name="calendar" /><h3>{isDemo(data) ? 'デモ収録範囲外です' : '収録範囲外のため確認できません'}</h3><p>収録期間は{coverageText(data)}です。収録期間内の日付を選んでください。</p></div>;
  return <>
    <p className="result-count" role="status">対象駅 <b>{summary.stationCount}駅</b><span>·</span>{summary.completed ? '開催試合' : '開催予定'} <b>{summary.count}試合</b>{summary.venueTbd.length > 0 && <span>会場未定 {summary.venueTbd.length}件</span>}{summary.pending.length > 0 && <span>開催日未定 {summary.pending.length}件</span>}</p>
    {summary.previousDayReturn && <p className="info-note">前日試合の帰宅目安を含みます。開催件数には含めていません。</p>}
    {!summary.rows.length && !summary.venueTbd.length && !summary.pending.length && !summary.conditional.length && <div className="empty-state"><Icon name="calendar" /><h3>{emptyText(data)}</h3><p>別の日付や場所を選んで確認できます。{!isDemo(data) && 'J2・J3・カップ戦は収録していません。'}通常の通勤や他のイベントによる混雑は対象外です。</p></div>}
    <div className="station-list">{summary.rows.map(result => <StationCard key={result.station.id} result={result} />)}</div>
    {summary.notices.length > 0 && <section className="change-notices"><h3>変更のお知らせ</h3>{summary.notices.map((n, i) => <article key={`${n.match.id}-${i}`}><span className="change-tag">{n.kind === 'postponed' ? '延期' : n.kind === 'cancelled' ? '中止' : n.kind === 'stadiumId' ? '会場変更済み' : n.kind === 'matchDate' ? '日程変更済み' : '時刻変更済み'}</span><MatchCard match={n.match} showDate />{n.kind === 'stadiumId' && <p>{venueName(n.change?.fromValue ?? null)} → {venueName(n.change?.toValue ?? null)}</p>}{n.kind === 'matchDate' && <p>{n.change?.fromValue} → {n.change?.toValue}</p>}<p className="small">{dateLabel(n.date)}・{venueName(n.stadiumId)}の変更案内です。旧予定の注意時間帯は表示しません。</p><a href={routeUrl(`/matches/${n.match.id}`, route)}>現在の開催情報を見る <Icon name="arrow" /></a></article>)}</section>}
    {summary.venueTbd.length > 0 && <section className="change-notices"><h3>会場未定 {summary.venueTbd.length}件</h3>{summary.venueTbd.map(m => <MatchCard key={m.id} match={m} />)}</section>}
    {summary.pending.length > 0 && <section className="change-notices"><h3>この日が開催候補の試合</h3><p>開催日はまだ決まっていません。開催件数・時間帯の計算には含めていません。</p>{summary.pending.map(m => <MatchCard key={m.id} match={m} showDate />)}</section>}
    {summary.conditional.length > 0 && <section className="change-notices"><h3>条件によりこの日に変更される可能性がある試合</h3><p>現在の開催予定とは別の候補です。開催件数には含めていません。</p>{summary.conditional.map(m => <MatchCard key={m.id} match={m} showDate />)}</section>}
  </>;
}
