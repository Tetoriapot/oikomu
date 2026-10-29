import rawCollection from '../../../data/collection.json';
import releases from '../../../data/releases.json';
import { useApp } from '../app/context';
import { routeUrl } from '../app/router';
import { toJst, todayJst } from '../domain/dates';
import { validateCollection, type CollectionInfo } from '../data/validateCollection';

export const REPOSITORY_URL = 'https://github.com/Tetoriapot/oikomu';
const stamp = (time: string) => toJst(Date.parse(time)).slice(0, 19).replace('T', ' ') + ' JST';
export function UpdatesPage() {
  const { data, route } = useApp();
  let collection: CollectionInfo | null = null;
  try { collection = validateCollection(rawCollection); } catch { /* The search stays usable even if history is damaged. */ }
  const demo = data.meta.mode === 'demo';
  const lastSuccess = collection?.lastSuccessAt ?? (!demo ? data.meta.updatedAt : undefined);
  const overdue = lastSuccess && toJst(Date.parse(lastSuccess)).slice(0, 10) < todayJst();
  return <div className="sources-page updates-page"><p className="eyebrow">デモ版・実験公開中</p><h1 tabIndex={-1}>更新情報</h1>
    <section className="panel spaced"><h2>日程データの更新</h2><p>公開版は毎日0:00（日本時間）に取得を開始する設定です。GitHub Actionsの実行待ちや処理時間により、反映は遅れる場合があります。</p>
      {demo && <p className="info-note">現在の表示は架空のサンプルデモです。以下の更新履歴はJ1実データを対象としています。</p>}
      <dl><div><dt>最終成功日時</dt><dd>{lastSuccess ? stamp(lastSuccess) : '成功した更新の記録はありません'}</dd></div><div><dt>更新予定</dt><dd>毎日0:00（Asia/Tokyo）</dd></div><div><dt>蓄積件数</dt><dd>{collection ? `${collection.snapshots.length}回の取得記録` : '確認できません'}</dd></div>{collection?.latestAttempt && <div><dt>直近の試行</dt><dd>{stamp(collection.latestAttempt.finishedAt)} · {collection.latestAttempt.status === 'success' ? '成功' : '失敗'}</dd></div>}</dl>
      {collection?.latestAttempt?.status === 'failed' && <p className="info-note" role="alert">直近の取得に失敗しました。最後に成功した日程を表示しています。公式日程を確認してください。</p>}
      {overdue && <p className="info-note">本日分の更新はまだ反映されていません。処理中・実行待ち・失敗の状態は更新の実行記録で確認できます。</p>}
      {!collection && <p className="info-note" role="alert">更新履歴を読み込めませんでした。再読み込みするか、更新の実行記録を確認してください。試合の検索は引き続き利用できます。</p>}
      <p>蓄積対象は公式日程を確認した時点のデータと、その出典・確認日時です。日程変更を比較するために保存します。駅の混雑人数・待ち時間・利用者の行動履歴は収集していません。会場と駅の対応・徒歩時間は手動で確認しています。</p>
      <a className="back-link" href={`${REPOSITORY_URL}/actions/workflows/pages.yml`} target="_blank" rel="noopener noreferrer">更新・公開の実行記録 ↗</a>
    </section>
    <section className="panel spaced"><h2>取得データの蓄積履歴</h2><p className="small muted">新しい順に最大30回を表示します。それ以前の取得記録もリポジトリに保存します。データはgzip圧縮したJSONです。</p>
      {collection?.snapshots.length ? <ul className="snapshot-list">{[...collection.snapshots].reverse().slice(0, 30).map(item => <li key={item.id}><time dateTime={item.checkedAt}>{stamp(item.checkedAt)}</time><span>{item.matchCount}試合</span><a href={`${REPOSITORY_URL}/blob/main/${item.path}`} target="_blank" rel="noopener noreferrer">取得データ ↗</a></li>)}</ul> : <p className="spaced">蓄積履歴はまだありません。</p>}
      <a className="back-link" href={`${REPOSITORY_URL}/tree/main/data/history`} target="_blank" rel="noopener noreferrer">すべての取得データ ↗</a>
    </section>
    <section className="spaced"><h2>アプリの更新履歴</h2>{releases.map(release => <article className="panel spaced" key={release.version}><p className="eyebrow">{release.date} · v{release.version}</p><h3>{release.title}</h3><ul>{release.changes.map(change => <li key={change}>{change}</li>)}</ul></article>)}</section>
    <p className="spaced"><a href={routeUrl('/help', route)}>Help</a> · <a href={routeUrl('/sources', route)}>検証・参照リンク</a></p>
  </div>;
}
