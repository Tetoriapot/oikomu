# 03 — データ設計

`contracts/types.ts`と`data/demo.json`を基準にする。JSONはUTF-8、schemaVersion=1。IDは表示名と分離し、改称してもIDを変えない。

## エンティティ

|配列／要素|用途|
|---|---|
|meta|モード、基準日、収録期間、説明|
|regions|東京都・神奈川県・埼玉県・千葉県|
|stations|7駅の名前、読み、別名、地域、並び順|
|stadiums|5会場の名前・別名・地域・公式参考リンク|
|accessLinks|会場と駅の多対多対応、デモ計算用移動分数|
|teams|架空8チーム。defaultStadiumIdは説明用で検索判定に使わない|
|matches|架空24試合。現在の会場と日付、状態、変更履歴|
|coverage|会場ごとの収録期間。サンプル集合内の網羅性のみを意味する|
|sources|実在会場と駅の対応を確認した公式出典|
|rules|注意時間帯のデモ計算パラメーター|

1試合は現在会場0〜1、1会場は関連駅1〜複数。駅→accessLinks→会場→matchesの順に結合する。ホームチーム→本拠地の結合で試合会場を決定してはいけない。

## Matchの不変条件

- matchDateは日本時間の暦日YYYY-MM-DD。kickoffLocalTimeはHH:mmまたはnull。
- scheduled：日付・会場・時刻が必須。
- time_tbd：日付・会場が必須、時刻はnull。
- venue_tbd：日付が必須、会場と時刻はnull。全地域の別枠にだけ表示。
- postponed／cancelled：日付・会場は元の予定を保持、時刻はnull。注意時間帯を生成しない。
- 日程変更後に確定した試合はscheduledに戻し、現在日付をmatchDateに保持。historyに旧日程を残す。同じ試合を別IDで増やさない。
- 会場変更も現在stadiumIdを更新し、historyに旧会場を残す。
- 同一IDは全体で一意。homeTeamIdとawayTeamIdは異なる。
- すべての試合はisDemo=true、sourceId=null。公式アクセス出典を試合出典として流用しない。

## History

fieldはmatchDate／stadiumId／kickoffLocalTime。fromValue・toValueは文字列またはnull、changedAtはオフセット付き日時、noteは「サンプル上の変更」と分かる文言。
historyは古い順。公開画面での最終変更表示は末尾、履歴一覧は新しい順でもよい。
このseedには日付と会場の同時変更は含めない。将来追加する際も逆順に履歴をたどれば変更直前のスナップショットを復元できる形にする。

## 時間の扱い

入力の日付と時刻から`${matchDate}T${kickoffLocalTime}:00+09:00`を生成する。解析・加算はタイムスタンプで、表示は必ずAsia/Tokyo。端末のタイムゾーンやtoISOString().slice(0,10)で表示日を決めない。

注意時間帯は保存せずrulesとaccessLinksから都度算出。ruleVersionを出力に付ける。サンプル移動分数は公式の徒歩時間の引用ではなくUI検証用の設定と明示する。

## Coverage

5会場それぞれ2026-11-01〜2026-12-31、state=demo_complete。これはこのJSONのサンプルとしての範囲であり、実在の試合を全件掲載している意味ではない。
全地域の集計もcoverageの対象内だけで行う。範囲外では0件表示よりも「デモ収録範囲外」を優先。未知の駅名は「対象外」として候補なしにする。

## 保存とURL

localStorage key：oikomu:demo:v1:favorites
value：{"schemaVersion":1,"stationIds":["st-tobitakyu"]}
ID重複と未知IDは除去。配列でない等の破損は空に戻す。savedDateや検索履歴は保存しない。

URLではdate、month、view、placeだけを許可。place=all／station:<id>／stadium:<id>／region:<id>。同時に複数種の場所を保持しない。詳細ページのdateは「戻るときの文脈」で、試合本体の日付を上書きしない。

## 検証ルール

読み込み時またはビルド時に、参照ID、重複、時刻形式、日付実在性、状態との整合、coverage包含を検証。致命的な参照欠損は黙って除去せずエラーにする。UIでの空状態とは分離する。
サンプルに悪意あるHTMLは含めないが、データ文字列は常にテキストとして描画。外部URLはhttps:の公式ドメインを許可し、javascript:等は拒否する。
