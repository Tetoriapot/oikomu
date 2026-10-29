import { useApp } from '../app/context';
import { routeUrl } from '../app/router';

export function HelpPage() {
  const { route } = useApp();
  return <div className="about-page help-page"><p className="eyebrow">操作方法と表示の意味</p><h1 tabIndex={-1}>Help</h1>
    <section className="panel spaced"><h2>日付と駅から調べる</h2><ol><li>日付を選び、駅・地域・スタジアムを候補から選択して「検索する」を押します。</li><li>「一覧」で駅ごとの試合と時間帯を、「月間」で月の予定を確認します。</li><li>駅名や試合名から詳細を開けます。星ボタンで駅を登録すると、お気に入りから呼び出せます。</li></ol><a href={routeUrl('/search', route)}>検索に戻る</a></section>
    <section className="panel spaced"><h2>よくある質問</h2>
      <details className="evidence-detail"><summary>デモ版ですが、試合日程は実データですか？</summary><p>通常表示はJリーグの公式日程を確認して収録した実データです。アプリはデモ版・実験公開中で、Jリーグや鉄道会社の公式サービスではありません。「サンプルデモ」に切り替えた場合だけ架空の日程を表示します。</p></details>
      <details className="evidence-detail"><summary>時間帯は実際の混雑を示していますか？</summary><p>開始時刻と公式徒歩時間から求めた参考計算です。J1では開始60分後からの早期退場も考慮していますが、人数・待ち時間・混雑予測の精度は未検証です。表示時間帯の外にも移動は発生します。</p><a href={routeUrl('/sources', route)}>計算の検証結果と参照URL</a></details>
      <details className="evidence-detail"><summary>いつ更新されますか？</summary><p>公開版は毎日0:00（日本時間）に日程の取得を開始する設定です。処理や実行待ちで反映が遅れることがあります。失敗した場合は最後に成功したデータを表示します。</p><p>蓄積するのは公表日程の確認履歴です。駅の実測混雑や利用者の行動履歴を収集する機能はありません。アクセス駅・徒歩分数は手動確認のため、日程とは確認日が異なります。</p><a href={routeUrl('/updates', route)}>更新情報と蓄積履歴</a></details>
      <details className="evidence-detail"><summary>試合なし・未定はどう読みますか？</summary><p>試合なしは収録データに該当する試合がない状態で、駅が空いている意味ではありません。日程・会場・時刻が未定の場合やバス利用の駅では、根拠のない時間帯を表示しません。各試合の公式リンクで最新情報を確認してください。</p></details>
      <details className="evidence-detail"><summary>お気に入りと表示モードはどこに保存されますか？</summary><p>このブラウザー内に保存します。別の端末とは同期しません。右上のライト／ダークで表示モードを変更できます。初回は端末の設定に従います。保存できない環境では、そのタブを開いている間だけ保持します。</p><p>検索条件は「URLをコピー」で共有できます。お気に入りはURLに含みません。</p></details>
    </section><section className="panel spaced"><h2>対象範囲・データ再設定</h2><p>収録会場、保存内容、サンプルデモへの切替、お気に入りの解除は使い方ページで確認できます。</p><a href={routeUrl('/about', route)}>使い方・対象範囲を開く</a></section>
  </div>;
}
