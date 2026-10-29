import { useState } from 'react';
import { useApp } from '../app/context';
import { routeUrl } from '../app/router';
import { checkedDate, coverageText } from '../domain/dataStatus';
import { REFERENCE_DATE, todayJst } from '../domain/dates';
import { useFavorites } from '../state/favorites';
import { Dialog } from '../components/Dialog';

export function AboutPage() {
  const { data, route } = useApp();
  const favorites = useFavorites();
  const demo = data.meta.mode === 'demo';
  const [confirm, setConfirm] = useState(false);
  const [cleared, setCleared] = useState(false);
  return <div className="about-page"><p className="eyebrow">使い方・対象範囲</p><h1 tabIndex={-1}>オイコムについて</h1><section className="panel spaced"><h2>日付と駅から確認する</h2><ol><li>日付を入力し、駅・地域・スタジアムを候補から選びます。空欄なら全地域を検索します。</li><li>「検索する」を押すと、その日の試合と来場・帰宅の目安が表示されます。</li><li>「月間」で月の予定を確認できます。駅の星ボタンでお気に入りに登録し、「URLをコピー」で検索条件を保存・共有できます。</li></ol><p>「オイコム」は「追い込む」と「おい！混む！」を掛けた名称です。サッカーを観戦しない方も、日付と駅から試合の予定を調べるための{demo ? 'デモ' : 'アプリ'}です。</p></section>
    <section className="panel spaced"><h2>{demo ? 'デモと実際の混雑の違い' : '公式日程と参考時間帯の違い'}</h2><p>{demo ? '大会、8チーム、24試合の日時・対戦・変更履歴は架空です。実在の駅・会場名は場所の説明に使っています。実際のお出かけ判断には使えません。' : 'Jリーグ公式サイトで発表された2026/27シーズンのJ1日程を収録しています。各試合の開催会場を使って、公式アクセス案内の最寄り・アクセス駅を表示します。'}</p><p>注意時間帯は{demo ? '開始時刻とデモ用の係数' : '開始時刻・公式の徒歩分数・未検証の共通係数'}から計算した目安です。実測値やAI予測ではありません。来場と帰宅の色は種類を表し、バーの長さは時間幅を表します。混雑の強さや安全性は示しません。</p><p>サッカー以外のイベント、通常の通勤ラッシュ、運休、入場規制、バス・車の混雑は対象外です。対象試合がないことは、駅が空いている根拠にはなりません。</p></section>
    <section className="panel spaced"><h2>収録期間と場所</h2><p>{demo ? '2026年11月1日〜12月31日のサンプルを収録しています。初期表示は2026年11月7日です。' : `収録期間は${coverageText(data)}、${data.teams.length}クラブ・${data.matches.length}試合・${data.stadiums.length}会場・${data.stations.length}駅です。初期表示は今日の日付です。`}日付と時刻はすべて日本時間（JST）で、端末のタイムゾーンには左右されません。</p><p>{demo ? '収録期間は、このデモのサンプル集合の範囲です。実在の試合を全件収録している意味ではありません。' : '開催日が複数候補の試合は、候補日ごとに「開催日未定」と表示し、確定した開催件数から除外します。条件付きの日程変更候補も別枠で表示します。会場未定の場合、ホームクラブの本拠地から駅を推測しません。'}</p><ul className="venue-list">{data.stadiums.map(s => <li key={s.id}><strong>{s.name}</strong><span>{data.accessLinks.filter(l => l.stadiumId === s.id).map(l => data.stations.find(st => st.id === l.stationId)?.name + '駅').join('・')}</span><a href={s.accessUrl} target="_blank" rel="noopener noreferrer">会場の公式アクセス ↗</a></li>)}</ul><p className="small muted">{demo ? '公式アクセスは場所の参考情報です。架空の試合日程やデモの計算係数の根拠には使用していません。' : '徒歩時間は公式案内で確認できた場合に限って使用します。出口・ゲートにより時間は異なります。バス利用や徒歩時間が未収録の駅では、参考時間帯を計算しません。'}</p></section>
    {!demo && <section className="panel spaced"><h2>データの更新と出典</h2><p>時間帯は過去の試合時間・人流・運行案内と照合しています。J1では早期退場を含めるため、帰宅の始点を開始60分後＋徒歩時間へ見直しました。変更前後の時間帯と根拠・限界を<a href={routeUrl('/sources', route)}>検証・参照リンク</a>に掲載しています。</p><p>日程の最終確認日：{checkedDate(data)}。公開版は毎日0:00（日本時間）に取得を開始します。実行待ちや失敗で反映が遅れる場合は、最後に成功したデータを表示します。最終確認から7日以上経つと更新確認の案内を表示します。</p><p>更新されていない間の日程変更は反映されません。「該当する試合がない」という表示だけで外出を判断せず、最新の公式日程を確認してください。J2・J3・カップ戦は対象外です。</p><p>日程の出典と確認日時は各試合の詳細に、駅との対応の出典は会場の公式アクセスに表示しています。初回取り込み以前の変更履歴は収録していません。</p><a href={data.meta.scheduleUrl} target="_blank" rel="noopener noreferrer">Jリーグ公式の日程・結果 ↗</a></section>}
    <section className="panel spaced"><h2>保存とデータ再設定</h2><p>このブラウザーにお気に入りの駅IDとライト／ダークの表示設定を保存します。検索条件はURLに保持します。アプリは利用履歴やお気に入りを外部へ送信しません。</p><p>「{demo ? 'デモ基準日へ戻る' : '今日へ戻る'}」は検索日だけを初期化します。場所・表示形式・お気に入りは保持します。</p><div className="reset-actions"><a className="button" href={routeUrl('/search', { ...route, date: demo ? REFERENCE_DATE : todayJst() })}>{demo ? 'デモ基準日へ戻る' : '今日へ戻る'}</a><button onClick={() => setConfirm(true)}>お気に入りをすべて解除</button></div>{cleared && <p className="info-note" role="status">お気に入りをすべて解除しました。</p>}</section>
    <section className="panel spaced"><h2>表示データの切り替え</h2><p>J1実データと架空のデモデータを別々に表示します。お気に入りはそれぞれ保存します。J1用の保存がまだない場合、既存デモで登録した対象駅を引き継ぎます。</p><a className="button" href={demo ? '?data=j1' : '?data=demo'}>{demo ? 'J1実データを開く' : 'サンプルデモを開く'}</a></section>
    {confirm && <Dialog title="お気に入りをすべて解除しますか？" onClose={() => setConfirm(false)}><p>登録した{favorites.ids.length}駅を解除します。この操作は取り消せません。</p><div className="dialog-actions"><button autoFocus onClick={() => setConfirm(false)}>キャンセル</button><button className="primary" onClick={() => { favorites.clear(); setCleared(true); setConfirm(false); }}>すべて解除する</button></div></Dialog>}
  </div>;
}

