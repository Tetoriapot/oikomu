import { departureStartAfterMinutes } from '../domain/windows';
import type { TimeWindow } from '../domain/types';
import { dayStart, timeLabel, toJst } from '../domain/dates';
import { routeUrl } from '../app/router';
import { useApp } from '../app/context';

export function TimeWindows({ windows, date, full = false }: { windows: TimeWindow[]; date: string; full?: boolean }) {
  const { data, route } = useApp();
  const demo = data.meta.mode === 'demo';
  const earlyDeparture = !demo && departureStartAfterMinutes(data.rules, demo) < data.rules.matchEndEarliestAfterMinutes;
  if (!windows.length) return null;
  const label = (timestamp: string) => {
    const d = toJst(Date.parse(timestamp)).slice(0, 10);
    return full && d !== date ? `${d} ${timeLabel(timestamp)}` : timeLabel(timestamp, full ? undefined : date);
  };
  const early = windows.some(w => Date.parse(w.start) - dayStart(date) < 6 * 3_600_000);
  const startHour = early ? 0 : 6;
  return <div className="time-windows">
    <div className="window-values">{windows.map((w, i) => <div className={`window-value ${w.kind}`} key={`${w.kind}-${i}`}><span>{w.kind === 'arrival' ? '来場の目安' : '帰宅の目安'}</span><strong>{label(w.start)}<span className="time-separator">〜</span>{label(w.end)}</strong>{w.kind === 'departure' && earlyDeparture && <small>早期退場を含む</small>}{w.matchIds.length > 1 && <small>{demo ? '複数のサンプル試合による目安' : '複数試合の参考計算'}</small>}</div>)}</div>
    {!full && <div className="timeline" aria-hidden="true"><div className="timeline-axis">{[0, 6, 12, 18, 24].filter(hour => hour >= startHour).map(hour => <span key={hour}>{String(hour).padStart(2, '0')}:00</span>)}</div>{(['arrival', 'departure'] as const).map(kind => <div className="timeline-track" key={kind}>{windows.filter(w => w.kind === kind).map((w, i) => <i className={kind} key={i} style={{ left: `${((Date.parse(w.start) - dayStart(date)) / 3_600_000 - startHour) / (24 - startHour) * 100}%`, width: `${(Date.parse(w.end) - Date.parse(w.start)) / 3_600_000 / (24 - startHour) * 100}%` }} />)}</div>)}</div>}
    <p className="window-note">{demo ? '目安・デモ計算' : '参考計算・予測精度は未検証。表示外の移動もあります。'}{!full && ' · バーの長さは時間幅です'}{!demo && <><br /><a href={routeUrl('/sources', route)}>時間帯の検証結果・参照リンク</a></>}</p>
  </div>;
}
