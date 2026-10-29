# 05 — 技術仕様・ファイル構成

## 採用方針

新規ならReact＋TypeScript＋Viteの静的SPA。サーバー、DB、秘密鍵、アカウントは不要。開発環境がオフラインなら既存依存を確認し、導入できないものを実行済みと扱わない。
Viteは公式にreact-tsテンプレートを提供する。Nodeの条件と依存互換性は実装時の公式ガイド・package enginesで確認し、実際に使用したバージョンをREADMEに記載する（SOURCES.md参照）。

既存リポジトリならその構成を優先する。新規はnpmとpackage-lock.jsonに統一。依存はReact、React DOM、Vite、TypeScriptを中心にし、Routerは既存導入がなければ小さなハッシュルーターで足りる。テストには互換性のあるVitest、必要に応じTesting Library／Playwrightを導入。

## 実装の配置案

|パス|責務|
|---|---|
|app/src/app/App.tsx|共通枠・ルート切替|
|app/src/app/router.ts|ハッシュURL解析・遷移|
|app/src/pages/SearchPage.tsx|一覧／月間・検索draft|
|app/src/pages/StationPage.tsx|駅詳細|
|app/src/pages/MatchPage.tsx|試合詳細|
|app/src/pages/FavoritesPage.tsx|登録駅|
|app/src/pages/AboutPage.tsx|説明・再設定|
|app/src/pages/NotFoundPage.tsx|未知ID・ルート|
|app/src/components/DemoBanner.tsx|デモ常設表示|
|app/src/components/PlaceCombobox.tsx|候補入力|
|app/src/components/MonthCalendar.tsx|42日セル|
|app/src/components/StationCard.tsx|駅の結果|
|app/src/components/MatchCard.tsx|試合と状態|
|app/src/components/TimeWindows.tsx|時間帯・目安ラベル|
|app/src/components/FavoriteButton.tsx|星ボタン|
|app/src/components/ChangeNotice.tsx|変更案内|
|app/src/domain/types.ts|contracts/types.tsに準拠|
|app/src/domain/dates.ts|日本時間・暦日・日付検証|
|app/src/domain/search.ts|候補・絞り込み・件数|
|app/src/domain/windows.ts|算出・クリップ・結合|
|app/src/domain/changes.ts|旧日程・旧会場の案内|
|app/src/data/demo.json|同梱データのコピー|
|app/src/data/repository.ts|データ読み込み・検証|
|app/src/state/favorites.ts|登録駅・保存失敗対応|
|app/src/styles/tokens.css|design/tokens.json由来の変数|
|app/src/styles/global.css|共通レスポンシブ|
|app/tests/domain/*|計算・状態・検索テスト|
|app/tests/e2e/*|主要な利用導線|
|app/README.md|実装後の環境・起動・制約|

配置は提案であり、既存プロジェクトに合わせて変更可能。データ、計算、画面の責務は維持する。

## データ層

デモJSONはアプリに同梱し、ネットワーク取得しない。データ層のgetDataset()から取得し、後に実データへ切り替える余地を作る。demoとliveのレコードを混在させない。
公開するのはビルドした静的ファイル。設定にサーバー用キーを含めない。外部サイトはリンクを押したときだけ開く。外部スクリプト・広告・アクセス解析・CDNの字体を入れない。

## UI状態

URL＝検索確定状態。フォーム内draft＝編集中。localStorage＝お気に入りだけ。計算結果＝派生状態。別々の状態に同じ検索条件を重複保存して同期不具合を作らない。
お気に入りは共通状態として管理し、どの画面の星ボタンでも即同期する。storageイベントで別タブの変更も反映できるとよいが、初版では同一タブ内を必須とする。

## セキュリティ・堅牢性

文字列はReactの通常テキスト描画。dangerouslySetInnerHTMLを使用しない。URLパラメーターの許可リスト、外部リンクのhttps制限、target=_blank時のnoopener noreferrerを実装。
localStorage.getItem/setItem/JSON.parseを例外処理する。削除は該当キーのみ。お気に入り以外の閲覧情報を送信しない。
デモデータで実在のクラブロゴや写真、公式の試合表のコピーを使わない。アプリ内に実在クラブが架空日程で試合するような表示をしない。

## 開発と確認

実装後はnpm install、npm run dev、npm run build、npm run previewを使えるようにする。test、typecheckを追加。ローカル起動のポートは実行結果のURLを案内。
unit：日時境界、未定等の抑制、件数重複、変更履歴、URL、保存データ破損。
browser：主要検索→詳細→お気に入り→再読み込み、キーボード操作、360／390／768／1440px、横スクロール、console error。
アプリを作っていない段階でbuild成功と報告しない。公開前の作業は別途依頼があった時だけ行う。
