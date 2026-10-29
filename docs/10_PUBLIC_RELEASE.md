# 実験公開と日次更新

2026-10-29の追加依頼により、GitHub Pagesで公開し、公式日程の取得記録を日々蓄積します。元のローカル版とデモの機能は維持します。

## 表示と操作

全画面の上部に「デモ版・実験公開中」を表示します。右上の「更新情報」では、最終成功日時、更新予定、取得履歴、機能の変更履歴を確認できます。「Help」では検索・保存・共有・時間帯の見方を説明し、既存の使い方と参照ページへ移動できます。

ライト／ダークの初期値はOSの設定に従い、選択後はブラウザーのlocalStorageの`oikomu:theme:v1`へ保存します。保存できない場合も、そのタブでは切り替えられます。お気に入りの保存キーは変更しません。検索条件を保持して各ページへ移動できます。

## 日次更新

`.github/workflows/pages.yml`の`0 15 * * *`は、UTCの15:00、日本時間の毎日0:00です。GitHub Actionsで取得・検証・保存・ビルド・公開を順に行います。実行待ちや処理時間があるため、0:00ちょうどの反映は保証しません。取得日時と更新予定は別に表示します。

対象は2026/27 J1の380試合です。公式検索結果と未終了試合の注記を順番に取得し、リクエストの間隔を500ミリ秒以上空けます。各取得には30秒のタイムアウトとサイズ上限を設け、HTTPSの公式ドメインだけに接続します。アクセス駅と徒歩分数は手動確認の対象です。次のシーズンへの移行には、対象期間・クラブ・会場対応と検証条件の更新が必要です。

取得結果は専用の作業ディレクトリで検証します。380試合、各クラブのホーム19試合、各節10試合、重複、会場・駅の参照関係、日時、公式URLなどを確認してから公開用ファイルを更新します。取得失敗や書き込み失敗では、直前の正常な日程と取得履歴を保持します。書き込み途中の失敗では、更新対象のファイルを元に戻します。

取得に失敗しても、既存データと失敗表示をビルド・公開できれば反映し、ワークフローは失敗として通知します。ビルドやデプロイ自体が失敗した場合は、公開済みのページが残ります。更新情報ページでは日本時間の当日分が未反映であることも判定し、実行記録へのリンクを表示します。GitHubの障害や長期間の非活動で定期実行が停止した場合は、Actionsで状態を確認して再開します。

`main`へのコード変更では単体テスト・ブラウザーテスト・本番ビルドを実行して公開します。定期実行では単体テストと時間計算の照合、本番ビルドを実行します。取得記録のコミットはGitHub Actionsのbotが行います。実行を直列化し、Gitの履歴を強制的に上書きしません。

## 蓄積するデータ

`data/history/`に、確認日時ごとのJSONをgzip圧縮して保存します。内容は`schemaVersion`、取得事実の`raw`、表示用データの`dataset`です。`data/collection.json`には最終成功日時、直近の試行結果、各記録の日時・件数・パス・圧縮ファイルのSHA-256を保存します。同一日時の同一内容は重複追加せず、異なる内容ならエラーにします。過去の記録は削除しません。

画面には最新30回の記録と、全記録を開くリンクを表示します。取得記録には日程や状態の事実、確認日時、出典URLを含めます。記事本文・写真・ロゴ・参照PDFそのものは保存・配信しません。混雑人数、改札通過数、駅の待ち時間、利用者の閲覧履歴は収集していません。時間帯は早期退場を含めた参考計算で、全国の混雑予測精度は未検証です。

圧縮ファイルは一般的なgzip対応ツールで展開できます。Node.jsで読む場合は次のようにします。

```js
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
const snapshot = JSON.parse(gunzipSync(readFileSync(process.argv[2])).toString('utf8'));
console.log(snapshot.raw.updatedAt, snapshot.dataset.matches.length);
```

## 手動更新と公開

GitHubのActionsで「Update J1 data and publish Pages」を選び、`Run workflow`を実行できます。`refresh_data`が有効なら日程を再取得し、無効なら保存済みデータで公開します。Pagesの公開元はGitHub Actionsです。

ローカルでは`app/update-j1.cmd`または`npm run data:collect`で取得と履歴保存を行います。`npm run data:archive`は保存済みデータを履歴へ追加するだけで、最新情報の取得はしません。従来の`npm run data:update`は日程ファイルのみを更新する互換コマンドとして残します。通常の更新には履歴も保存する`data:collect`を使用してください。`npm run data:build`は取得済みの事実から再構築します。

公開元は[Tetoriapot/oikomu](https://github.com/Tetoriapot/oikomu)、実行結果は[Actions](https://github.com/Tetoriapot/oikomu/actions)で確認できます。公開サイトはJリーグや鉄道事業者の公式サービスではありません。実際の移動前には各試合・会場の公式情報を確認してください。

## 技術資料

- [GitHub Pagesのカスタムワークフロー](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Pagesの公開元の設定](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [GitHub Actionsの定期実行と制約](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
