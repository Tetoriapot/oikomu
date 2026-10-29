import type { DemoDataset } from '../domain/types';
import { checkedDate, isStale } from '../domain/dataStatus';

export function DemoBanner({ data }: { data?: DemoDataset }) {
  if (!data) return <div className="demo-banner"><span className="demo-label">デモ版・実験公開中</span><span>オイコム · データを確認しています</span></div>;
  if (data.meta.mode === 'j1') return <div className={`demo-banner real-banner ${isStale(data) ? 'stale-banner' : ''}`}><span className="demo-label">デモ版・実験公開中</span><span>J1公式日程 · {checkedDate(data)}確認 · 公開版は毎日0:00更新予定{isStale(data) ? ' · 最終確認から7日以上経過しています。公式日程を確認してください。' : ' · 時間帯は未検証の参考計算です。'}</span><a href={data.meta.scheduleUrl} target="_blank" rel="noopener noreferrer">公式日程 ↗</a></div>;
  return <div className="demo-banner"><span className="demo-label">デモ版・実験公開中</span><span>試合・注意時間帯はサンプル。実際のお出かけ判断には使えません。</span></div>;
}
