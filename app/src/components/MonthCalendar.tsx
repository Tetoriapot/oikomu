import { useApp } from '../app/context';
import { routeUrl } from '../app/router';
import { calendarDays, dateLabel, moveMonth } from '../domain/dates';
import { summarizeDay } from '../domain/search';

export function MonthCalendar() {
  const { data, route } = useApp();
  const days = calendarDays(route.date);
  const select = (date: string) => { location.hash = routeUrl('/search', { ...route, date, view: 'calendar' }); };
  return <section className="calendar-panel" aria-label="月間カレンダー">
    <div className="calendar-header"><h2>{Number(route.month.slice(0, 4))}年{Number(route.month.slice(5))}月</h2><div className="month-actions"><button aria-label="前の月" onClick={() => select(moveMonth(route.date, -1))}>‹</button><button aria-label="次の月" onClick={() => select(moveMonth(route.date, 1))}>›</button></div></div>
    <table className="calendar"><caption className="visually-hidden">月曜始まりの月間カレンダー</caption><thead><tr>{['月', '火', '水', '木', '金', '土', '日'].map(d => <th scope="col" key={d}>{d}</th>)}</tr></thead><tbody>{Array.from({ length: 6 }, (_, week) => <tr key={week}>{days.slice(week * 7, week * 7 + 7).map(date => {
      const day = summarizeDay(data, date, route.place);
      const labels = !day.covered ? ['範囲外'] : [...(day.count ? [`${day.count}試合`] : []), ...(day.timeTbd ? ['時刻未定'] : []), ...(day.pending.length ? ['日程未定'] : []), ...(day.conditional.length ? ['変更候補'] : []), ...(day.hasChanges ? ['変更'] : []), ...(day.venueTbd.length ? ['会場未定'] : []), ...(day.previousDayReturn ? ['前日帰宅'] : [])];
      return <td key={date}><button className={`${date.slice(0, 7) !== route.month ? 'other-month ' : ''}${!day.covered ? 'uncovered ' : ''}${date === route.date ? 'selected' : ''}`} aria-pressed={date === route.date} aria-label={`${dateLabel(date)} ${labels.join(' ') || '対象試合なし'}`} onClick={() => select(date)}><span className="day-number">{Number(date.slice(8))}</span>{labels.map(l => <span className={`day-label ${l === '変更' ? 'changed' : ''}`} key={l}>{l === '日程未定' ? '日程？' : l === '変更候補' ? '変更？' : l === '時刻未定' ? '未定' : l === '会場未定' ? '会場？' : l === '前日帰宅' ? '前日' : l}</span>)}</button></td>;
    })}</tr>)}</tbody></table>
    <p className="calendar-legend">{data.meta.mode === 'demo' ? '件数は開催予定のサンプル試合です。' : '件数は開催日と会場が決まっているJ1の試合です（終了分を含みます）。日程？＝開催日未定、変更？＝条件付きの変更候補です。どちらも件数に含めません。'}延期・中止・旧会場の案内は含みません。未定＝開始時刻未定、会場？＝会場未定、前日＝前日試合の帰宅目安。</p>
  </section>;
}
