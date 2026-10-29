import { useApp } from '../app/context';
import { routeUrl } from '../app/router';
import { calculateWindows, departureStartAfterMinutes } from '../domain/windows';
import { dateLabel, toJst } from '../domain/dates';
import { MatchCard, statusText } from '../components/MatchCard';
import { TimeWindows } from '../components/TimeWindows';
import { FavoriteButton } from '../components/FavoriteButton';
import { ShareButton } from '../components/ShareButton';
import { NotFoundPage } from './NotFoundPage';
import type { Change } from '../domain/types';
import { matchDateText } from '../domain/dataStatus';

export function MatchPage({ id }: { id: string }) {
  const { data, route } = useApp();
  const match = data.matches.find(m => m.id === id);
  if (!match) return <NotFoundPage />;
  const stadium = data.stadiums.find(s => s.id === match.stadiumId);
  const valueLabel = (field: Change['field'], value: string | null) => value === null ? '未定' : field === 'stadiumId' ? data.stadiums.find(s => s.id === value)?.name : value;
  const links = data.accessLinks.filter(l => l.stadiumId === match.stadiumId);
  const source = data.sources.find(s => s.id === match.sourceId);
  return <>
    <a className="back-link" href={routeUrl('/search', route)}>← 検索結果に戻る</a>
    <div className="detail-heading"><div><p className="eyebrow">{match.competitionName}</p><h1 tabIndex={-1}>{match.isDemo ? 'サンプル試合の詳細' : 'J1の試合詳細'}</h1></div></div>
    <div className="detail-grid"><section><section className="panel match-overview"><MatchCard match={match} link={false} /><dl><div><dt>開始日時</dt><dd>{match.status === 'date_tbd' ? matchDateText(match) : dateLabel(match.matchDate)}<br />{match.kickoffLocalTime ?? '開始時刻未定'}（日本時間）</dd></div><div><dt>現在の会場</dt><dd>{stadium?.name ?? '会場未定'}</dd></div><div><dt>状態</dt><dd>{statusText[match.status]}</dd></div></dl>{match.isDemo ? <p className="info-note">この試合は架空のサンプルです。公式の試合日程ではありません。</p> : <div className="info-note"><p>公式日程の確認日時：{toJst(Date.parse(match.checkedAt!)).slice(0, 16).replace('T', ' ')} JST</p><a href={source?.url} target="_blank" rel="noopener noreferrer">この試合の公式日程・最新情報 ↗</a><p className="small">日程・会場が変更される場合があります。出発前に公式情報を確認してください。</p></div>}</section>
      <section className="spaced"><h2>対象駅と注意時間帯</h2><p className="muted small">{match.isDemo ? '目安・デモ計算。' : '参考計算・未検証。'}駅の混雑量や改札待ち時間を表すものではありません。</p>{!links.length && <p className="info-note">会場未定・対象駅をまだ表示できません。</p>}<div className="station-list spaced">{links.map(link => {
        const station = data.stations.find(s => s.id === link.stationId)!;
        const windows = calculateWindows(match, link, data.rules);
        return <article className="station-card" key={station.id}><div className="station-heading"><h3><a href={routeUrl(`/stations/${station.id}`, route)}>{station.name}駅</a></h3><FavoriteButton station={station} /></div>{windows.length ? <div className="spaced"><TimeWindows windows={windows} date={match.matchDate} full /></div> : <p className="notice-text">{match.status === 'scheduled' ? '移動時間が未収録、またはバス利用のため、参考時間帯は計算していません。' : statusText[match.status]}</p>}<p className="small muted">{match.isDemo ? `デモ移動分数 ${link.demoWalkMinutes}分。公式の徒歩時間の引用ではありません。` : link.accessNote}</p>{!match.isDemo && <p className="small muted">アクセス情報：{link.checkedOn}確認</p>}</article>;
      })}</div></section>
      <details className="panel spaced calculation"><summary>時間帯の出し方</summary><p>開始時刻をK、{match.isDemo ? 'デモ移動分数' : '公式案内にある徒歩分数'}をWとします。</p><p>来場の目安はKの{data.rules.arrivalStartBeforeMinutes}分前から{data.rules.arrivalEndBeforeMinutes}分前まで。帰宅の目安はKの{departureStartAfterMinutes(data.rules, match.isDemo)}分後＋Wから、{data.rules.matchEndLatestAfterMinutes}分後＋W＋{data.rules.departureTailMinutes}分までです。</p>{!match.isDemo && data.rules.earlyDepartureAfterMinutes !== undefined && <p>帰宅の始点は、国立競技場で開始約60分後から退場を観測した事例を参考にしています。試合終了の見込みは開始{data.rules.matchEndEarliestAfterMinutes}〜{data.rules.matchEndLatestAfterMinutes}分後のままです。1試合の観測を共通の仮定として採用しており、全国の混雑開始を実測した値ではありません。</p>}<p>来場の計算に移動分数は加えません。帰宅の駅ごとの差は{match.isDemo ? 'デモ移動分数' : '徒歩分数'}によるもので、混雑量の差ではありません。</p><p>開催日・時刻・会場が未定の試合、延期・中止・終了した試合、徒歩時間が未収録の駅では計算しません。延長戦、天候、臨時列車、試合後イベントは計算に含みません。区間の終端は含みません。</p>{!match.isDemo && <p>早期退場を含むように見直した後も、表示時間帯の外に移動が発生する可能性があります。<a href={routeUrl('/sources', route)}>時間帯の検証結果・参照リンク</a>で根拠と限界を確認できます。</p>}<p className="small muted">計算ルール {data.rules.version} · 実測や公式推奨に基づく予報ではありません。</p></details>
    </section><aside><section className="panel"><h2>変更履歴</h2>{match.history.length ? [...match.history].reverse().map((h, i) => <div className="history-item" key={i}><p className="small muted">{toJst(Date.parse(h.changedAt)).slice(0, 16).replace('T', ' ')} JST</p><h3>{h.note}</h3><p>{valueLabel(h.field, h.fromValue)}<br />↓<br />{valueLabel(h.field, h.toValue)}</p></div>) : <p className="muted spaced">{match.isDemo ? '変更履歴はありません。' : '初回取り込み後に検出した変更はありません。初回以前の履歴は収録していません。'}</p>}</section>{stadium && <section className="panel spaced"><h2>会場のアクセス</h2><p>{stadium.name}</p><a className="back-link" href={stadium.accessUrl} target="_blank" rel="noopener noreferrer">会場の公式アクセス ↗</a><p className="small muted">{match.isDemo ? '実在会場の場所の参考情報です。架空の試合日程の出典には使用していません。' : '各駅からの経路・出口・当日の交通案内を公式サイトで確認してください。'}</p></section>}<ShareButton /></aside></div>
  </>;
}
