import { useState } from 'react';
import { useApp } from '../app/context';
import { routeUrl } from '../app/router';
import type { Place } from '../domain/types';
import { REFERENCE_DATE, todayJst, dateLabel, validDate } from '../domain/dates';
import { placeKey, placeLabel, summarizeDay } from '../domain/search';
import { PlaceCombobox } from '../components/PlaceCombobox';
import { DayResults } from '../components/DayResults';
import { MonthCalendar } from '../components/MonthCalendar';
import { Icon } from '../components/Icon';
import { ShareButton } from '../components/ShareButton';
import { isDemo, coverageText } from '../domain/dataStatus';
import { useFavorites } from '../state/favorites';

function SearchForm() {
  const { data, route } = useApp();
  const [date, setDate] = useState(route.date);
  const [place, setPlace] = useState<Place | null>(route.place);
  const [text, setText] = useState(route.place.type === 'all' ? '' : placeLabel(data, route.place));
  const [error, setError] = useState('');
  return <form className="search-form" noValidate onSubmit={e => {
    e.preventDefault();
    if (!validDate(date)) { setError('実在する日付を入力してください。'); return; }
    if (text.trim() && !place) { setError('候補から場所を選んでください。'); return; }
    setError(''); location.hash = routeUrl('/search', { ...route, date, place: text.trim() ? place! : { type: 'all' } });
  }}>
    <div className="date-field"><label htmlFor="search-date">日付</label><input id="search-date" type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
    <PlaceCombobox value={text} onInput={value => { setText(value); setPlace(null); setError(''); }} onSelect={(next, label) => { setPlace(next); setText(label); setError(''); }} />
    <button className="primary search-submit" type="submit"><Icon name="search" />検索する</button>
    {error && <p className="form-error" role="alert">{error}</p>}
  </form>;
}
export function SearchPage() {
  const { data, route } = useApp();
  const favorites = useFavorites();
  const summary = summarizeDay(data, route.date, route.place);
  const demo = isDemo(data);
  const nextDate = data.matches.filter(m => m.status === 'scheduled' && m.matchDate > route.date).map(m => m.matchDate).sort().find(date => summarizeDay(data, date, route.place).count > 0);
  return <>
    <div className="page-intro"><div><p className="eyebrow">サッカー開催日の駅混雑カレンダー</p><h1 tabIndex={-1}>日付と駅から試合を探す</h1><p className="muted">{demo ? '近くのサンプル試合と、来場・帰宅の注意時間帯を確認できます。' : 'J1の試合日程と、実際の開催会場の最寄り・アクセス駅を確認できます。'}</p></div><div className="coverage-label"><span className="coverage-dot" />{demo ? '2026年11〜12月収録' : '2026/27 J1リーグ'}<span>{demo ? '関東5会場・7駅' : `${data.teams.length}クラブ・${data.stadiums.length}会場・${data.stations.length}駅`}</span></div></div>
    <SearchForm key={`${route.date}-${placeKey(route.place)}`} />
    <div className="search-context"><div><span className="muted small">選択中の場所</span><span className="selection-chip">{placeLabel(data, route.place)}{route.place.type !== 'all' && <a aria-label="場所の選択を解除" href={routeUrl('/search', { ...route, place: { type: 'all' } })}>×</a>}</span></div><a className="small" href={routeUrl('/search', { ...route, date: demo ? REFERENCE_DATE : todayJst() })}>{demo ? 'デモ基準日へ' : '今日へ'}</a></div>
    <div className={`search-layout ${route.view === 'calendar' ? 'calendar-mode' : ''}`}>
      <aside className="sidebar"><details open><summary>場所から探す</summary><nav aria-label="対象地域"><a className={route.place.type === 'all' ? 'active' : ''} href={routeUrl('/search', { ...route, place: { type: 'all' } })}>すべての対象地域<span>{data.regions.length}地域</span></a>{data.regions.map(region => <a className={placeKey(route.place) === `region:${region.id}` ? 'active' : ''} key={region.id} href={routeUrl('/search', { ...route, place: { type: 'region', id: region.id } })}>{region.name}<Icon name="chevron" /></a>)}</nav></details><section className="side-block"><h2><Icon name="star" /> お気に入り</h2>{favorites.ids.length ? <nav aria-label="お気に入りの場所">{favorites.ids.map(id => <a key={id} href={routeUrl('/search', { ...route, place: { type: 'station', id } })}>{data.stations.find(s => s.id === id)?.name}駅<Icon name="chevron" /></a>)}</nav> : <p className="muted small">駅の星ボタンで登録すると、ここから検索できます。</p>}</section><div className="sidebar-note"><Icon name="info" /><p>{demo ? '表示するのは架空の試合と計算上の目安です。実際の混雑状況は確認できません。' : `収録期間 ${coverageText(data)}。J1のみが対象です。J2・J3・カップ戦は含みません。`}</p></div></aside>
      <section className="results"><div className="results-toolbar"><h2>{dateLabel(route.date)}</h2><nav className="view-switch" aria-label="表示形式"><a aria-current={route.view === 'list' ? 'page' : undefined} href={routeUrl('/search', { ...route, view: 'list' })}><Icon name="search" />一覧</a><a aria-current={route.view === 'calendar' ? 'page' : undefined} href={routeUrl('/search', { ...route, view: 'calendar' })}><Icon name="calendar" />月間</a></nav></div>
        <div className={route.view === 'calendar' ? 'calendar-layout' : ''}>{route.view === 'calendar' && <MonthCalendar />}<section aria-label="選択日の詳細"><DayResults summary={summary} /></section></div>
        <div className="info-note"><Icon name="info" /><p>{demo ? '試合開催と混雑の実測は別の情報です。時間帯はサンプルの条件から計算しています。' : '時間帯は開始時刻と徒歩時間による参考計算です。混雑の実測や検証済みの予測ではありません。'}{!demo && <><br /><a href={routeUrl('/sources', route)}>時間帯の検証結果・参照リンク</a></>}</p></div>
        {!demo && !summary.count && nextDate && <a className="button" href={routeUrl('/search', { ...route, date: nextDate })}>次の開催日 {nextDate} を表示</a>}
        <ShareButton />
      </section>
    </div>
  </>;
}
