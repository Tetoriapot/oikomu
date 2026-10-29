# 出典・データの境界

確認日：2026-10-27。以下は場所の対応と技術選択の参考資料。本文は要約であり、記事や公式日程表の転載ではない。

|ID|発行者・ページ|確認した内容|URL|
|---|---|---|---|
|src-ajino|味の素スタジアム／アクセス|飛田給・多磨をアクセス駅として案内|https://www.ajinomotostadium.com/access/|
|src-nissan|日産スタジアム／電車でお越しの方|新横浜・小机からの徒歩ルートへの案内|https://www.nissan-stadium.jp/access/train.php|
|src-saitama|埼玉スタジアム2002／アクセス|浦和美園からの歩行者アクセス|https://www.stadium2002.com/access.html|
|src-fukuari|ジェフユナイテッド市原・千葉／アクセス|蘇我からフクダ電子アリーナへのアクセス|https://jefunited.co.jp/stadium/access/|
|src-kashiwa|柏レイソル／初観戦ガイド|三協フロンテア柏スタジアムと柏駅からのアクセス|https://reysol.co.jp/game/beginnersguide/|
|tech-vite|Vite／Getting Started|react-tsテンプレートと開発・ビルドの仕組み|https://vite.dev/guide/|

## サンプルとして作成したもの

大会、8チーム、24試合の対戦と日時、状態変更、変更時刻、時間帯計算の係数、demoWalkMinutesは企画説明・実装検証用に作成した架空データ。
公式の試合日程、観客数、混雑データ、鉄道の運行情報を収録していない。

会場・駅の名称と対応を知るために公式資料を参照したが、デモ係数や架空日程が公式に裏付けられていることを意味しない。URLを開く時点で名称やアクセス方法が変わっている可能性があるため、実データ化時には再確認する。

## J1実データの出典

2026-10-29の追加依頼により、以下の実データを取り込みました。上記のサンプル説明は`data/demo.json`に引き続き適用します。J1の試合は`data/j1.json`、公式アクセス案内の確認結果は`data/j1-access.json`です。

[2026/27 J1公式日程](https://www.jleague.jp/j1/match/search-list/?category=j1&period=custom&startdate=2026-08-01&enddate=2027-06-30)と、各試合の公式詳細に掲載された日程注記を確認しました。検索結果は250件が上限となるため、8〜12月・1〜3月・4〜6月に分けて取得しています。取得事実、試合ごとのURL・確認時刻、検索結果のSHA-256は`data/sources/j1-2026-27.json`に保存しています。[Jリーグの日程発表](https://www.jleague.jp/corporate/pressrelease/article/16058)も、未定日程の扱いを確認する際に参照しました。

以下の会場・駅の対応は2026-10-29に確認しました。分数を確認できた徒歩経路だけを数値で登録し、バス利用や分数未確認の経路は注記を付けています。公式情報の画像・記事本文・ロゴは収録していません。

|会場|公式案内で確認した駅|公式アクセス案内|
|---|---|---|
|メルカリスタジアム|鹿島サッカースタジアム|[公式案内](https://www.rintetsu.co.jp/route_map/kashima-stadium)|
|水戸信用金庫スタジアム|東海|[公式案内](https://www.mito-hollyhock.net/news/p%3D55591/)|
|埼玉スタジアム2002|浦和美園|[公式案内](https://www.stadium2002.com/access.html)|
|フクダ電子アリーナ|蘇我|[公式案内](https://jefunited.co.jp/stadium/access/)|
|三協フロンテア柏スタジアム|柏|[公式案内](https://reysol.co.jp/game/beginnersguide/)|
|味の素スタジアム|飛田給・多磨|[公式案内](https://www.ajinomotostadium.com/access/)|
|町田GIONスタジアム|鶴川（バス利用）|[公式案内](https://www.nozuta-park.com/access.html)|
|MUFGスタジアム|国立競技場・千駄ケ谷・信濃町・外苑前|[公式案内](https://jns-e.com/access/)|
|日産スタジアム|小机・新横浜|[公式案内](https://www.nissan-stadium.jp/access/train.php)|
|Uvanceとどろきスタジアム by Fujitsu|武蔵中原・新丸子・武蔵小杉|[公式案内](https://www.frontale.co.jp/access/uvance_todoroki.html)|
|IAIスタジアム日本平|清水（バス利用）|[公式案内](https://www.s-pulse.co.jp/guides/faq)|
|豊田スタジアム|豊田市・新豊田|[公式案内](https://www.nagoya-grampus.jp/stadium/toyota-stadium/access.html)|
|パロマ瑞穂スタジアム|瑞穂運動場東・瑞穂運動場西・新瑞橋|[公式案内](https://nagoya-grampus.jp/news/game/2026/0414post-2714.php)|
|サンガスタジアム by KYOCERA|亀岡|[公式案内](https://sangastadium-by-kyocera.jp/access-parking)|
|パナソニック スタジアム 吹田|万博記念公園|[公式案内](https://www.gamba-osaka.net/c/stadium/access.html)|
|YANMAR HANASAKA STADIUM|鶴ケ丘・長居・西田辺・針中野|[公式案内](https://www.cerezo.jp/stadium/)|
|ヤンマースタジアム長居|長居・鶴ケ丘|[公式案内](https://nagaipark.com/access/)|
|ノエビアスタジアム神戸|御崎公園|[公式案内](https://www.noevir-stadium.jp/access/)|
|JFE晴れの国スタジアム|岡山|[公式案内](https://www.fagiano-okayama.com/stadium/car/)|
|エディオンピースウイング広島|城北・県庁前・原爆ドーム前・新白島|[公式案内](https://www.sanfrecce.co.jp/games/stadium/access)|
|ベスト電器スタジアム|福岡空港|[公式案内](https://www.avispa.co.jp/match/stadiumaccess)|
|PEACE STADIUM Connected by SoftBank|スタジアムシティノース・浦上・長崎|[公式案内](https://www.nagasakistadiumcity.com/access/)|

徒歩分数の確認日と出典IDは各accessLinksに保存しています。日程を更新してもアクセス案内の確認日は変えません。時刻・会場が未定の場合や、別会場での開催はそのまま区別します。時間帯の計算係数は従来の仮定であり、今回の公式データ取得によって混雑予測の妥当性が確認されたものではありません。

## 時間検証の参照URL

確認日2026-10-29。アプリの`#/sources`にも、以下のURLと対象期間・使い方・限界を掲載しています。比較用の数値は`data/time-evidence.json`、判定方法は[時間帯の過去資料照合](docs/09_TIME_VALIDATION.md)を参照してください。

|資料|採用した内容と対象|使える範囲|
|---|---|---|
|[J STATS REPORT 2025](https://www.jleague.jp/img/pdf/33433_01.pdf#page=18)|冊子34ページ、PDF18ページ。J1の2021〜2025年の平均試合時間|ハーフタイム加算後の年平均と110〜130分の比較。個々の試合の最短・最長ではない|
|[Jリーグの試合時間解説](https://www.jleague.jp/a-to-z/game_time/)|前後半45分、ハーフタイム15分|経過時間の目安への換算。混雑の観測資料ではない|
|[等々力周辺の共同調査](https://www.jeri.or.jp/wp-content/uploads/2025/06/202508-09_06_report.pdf#page=25)|2024年3〜10月、500m四方・1時間単位の基地局人流推計。資料24ページほか|駅周辺のピークと減少傾向。改札人数や5分単位の境界は判定できない|
|[国立競技場の人流観測](https://www.oec.okaya.co.jp/solution/nagaremiru/jirei/cs-nagaremiru-fctokyo-kokuritsu/)|2024-09-14 FC東京対名古屋。ゲートのLiDAR観測|早期退場の存在。1試合であり、駅到着の実測とは異なる|
|[2025-05-25の臨時停車案内](https://www.ajinomotostadium.com/schedule/2025/0525_9009.php)|東京V対京都、15時開始。飛田給駅の到着13本・出発11本|公表時刻の包含検査。運行実績・混雑ではない|
|[2025-06-14の臨時停車案内](https://www.ajinomotostadium.com/schedule/2025/0614_9010.php)|FC東京対C大阪、19時開始。飛田給駅の到着14本・出発11本|昼と夜を比較。同じ会場・駅の2試合で全国を代表しない|
|[デンソーテンの神戸での実証](https://www.denso-ten.com/jp/technicalreview/vol4/2/index.html)|滞在促進施策の利用者は試合後の滞在が約30分長い。Web概要に全対象試合の日付なし|運営施策による変動の参考。90分という係数の根拠ではない|
|[産総研の天皇杯調査](https://www.aist.go.jp/aist_j/new_research/2022/nr20220322/nr20220322.html)|2021年12月の準決勝・決勝3試合。試合終了・表彰式・インタビューによる退場ピーク|試合後イベントの影響を確認。J1ではなく、数値校正に使用しない|

等々力の資料は[共同調査の紹介ページ](https://www.jeri.or.jp/survey/202508-09_06/)でも説明されています。画像や記事本文の転載はせず、数値と要約、参照URLを保存しています。

同日の追加依頼により、国立競技場の開始約60分後からの早期退場をJ1共通の計算の仮定に採用しました。帰宅の始点を開始110分後＋徒歩時間から60分後＋徒歩時間へ変更し、元の区間を含むよう50分広げています。試合終了見込み、来場帯、帰宅の終端は変更していません。1試合のゲート観測を駅到着の実測や全国の混雑予測の精度へ置き換えたものではありません。


## 公開・定期更新の参照資料

2026-10-29にGitHub公式の[Pagesのカスタムワークフロー](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)と[定期実行の仕様](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)を確認しました。UTCの15:00を日本時間の0:00として設定し、実行待ちによる遅延を画面に明記しています。

Jリーグ公式サイトの[robots.txt](https://www.jleague.jp/robots.txt)、[著作権の案内](https://www.jleague.jp/sp/general/copyright.html?mode=pc)、[利用規約](https://www.jleague.jp/sp/general/kiyaku.html?mode=pc)を確認しています。取り込む内容は日程や状態の事実と出典情報です。記事本文・画像・ロゴは配信しません。robots.txtは転載許可を示すものではありません。
