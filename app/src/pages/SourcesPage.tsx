import rawEvidence from '../../../data/time-evidence.json';
import { useApp } from '../app/context';
import { routeUrl } from '../app/router';
import { validateTimeEvidence } from '../data/validateTimeEvidence';
import { buildTimeValidation, clockMinutes, minuteClock, minuteSeconds } from '../domain/timeValidation';
import type { TimeEvidence } from '../../../contracts/time-evidence';
import type { DemoDataset } from '../domain/types';

function ReferenceLink({ evidence, id }: { evidence: TimeEvidence; id: string }) {
  const source = evidence.sources.find(item => item.id === id)!;
  return <a href={source.url} target="_blank" rel="noopener noreferrer">出典：{source.title} ↗</a>;
}

function TimeComparison({ data, evidence }: { data: DemoDataset; evidence: TimeEvidence }) {
  const report = buildTimeValidation(data.rules, data.accessLinks, evidence);
  const rules = data.rules;
  const gateKickoff = clockMinutes(evidence.kokuritsu.kickoff);
  return <>
    {!report.reviewIsCurrent && <p className="info-note" role="alert">計算ルールが資料照合時から変わっています。数値比較は現在の係数で再計算していますが、解釈の再確認が必要です。</p>}
    <section className="panel spaced validation-result" aria-labelledby="validation-outcome">
      <p className="eyebrow">資料照合済み・混雑予測の精度は未検証</p>
      <h2 id="validation-outcome">早期退場を考慮し、帰宅時間帯の始点を早めました</h2>
      <p>国立競技場の観測事例を参考に、J1の帰宅時間帯を「開始{report.baselineDepartureStartAfterMinutes}分後＋徒歩時間」から「開始{report.departureStartAfterMinutes}分後＋徒歩時間」へ見直しました。試合終了前の移動も含めるための共通の仮定です。全国の駅で混雑が始まる時刻を実測した値ではありません。</p>
      <p>来場時間帯、試合終了の見込み、帰宅時間帯の終端は維持しています。過去5シーズンの平均試合時間と飛田給駅の運行案内を再照合し、従来の時間帯を含むように広げています。</p>
      <p>時間帯の外でも来場・帰宅は発生します。列車の時刻が含まれる割合や、平均試合時間との一致を、混雑予測の的中率として扱いません。</p>
      <dl className="parameter-review">
        <div><dt>来場の開始<br />開始{rules.arrivalStartBeforeMinutes}分前</dt><dd>等々力の来場ピークは開始{Math.abs(evidence.todoroki.arrivalPeakMinutes)}分前です。{report.todoroki.peakIncluded ? 'ピークは計算区間内ですが、' : 'ピークは計算区間外で、'}来場が増え始める時刻の根拠にはできません。</dd></div>
        <div><dt>来場の終了<br />開始{rules.arrivalEndBeforeMinutes}分前</dt><dd>遅れて到着する観客を含め、来場が収まる時刻を裏付ける駅別データはありません。</dd></div>
        <div><dt>試合終了の見込み<br />開始{rules.matchEndEarliestAfterMinutes}〜{rules.matchEndLatestAfterMinutes}分後</dt><dd>ハーフタイムを加えた過去の年平均は{report.seasons.every(item => item.withinEstimate) ? 'すべて範囲内です。' : '範囲外の年があります。'}個々の試合の最短・最長や中断は保証できません。</dd></div>
        <div><dt>帰宅の開始<br />開始{report.departureStartAfterMinutes}分後＋徒歩</dt><dd>国立で開始約{evidence.kokuritsu.earlyExitMinutes}分後から退場を観測した事例を採用しました。試合終了の見込みとは別の設定です。より早い退場や、ゲート・駅での待機時間は推定していません。</dd></div>
        <div><dt>帰宅の終端に加算<br />{rules.departureTailMinutes}分</dt><dd>試合後の滞在は、会場、昼夜、分散退場、イベントでも変わります。全国一律の{rules.departureTailMinutes}分を裏付ける実測分布はありません。</dd></div>
      </dl>
    </section>

    <section className="panel spaced" aria-labelledby="duration-title">
      <h2 id="duration-title">試合時間との比較</h2>
      <p>J1の年平均試合時間にハーフタイム{evidence.duration.halftimeSeconds / 60}分を加え、キックオフからの経過時間の目安に換算しました。実際の中断時間や再開の遅れを再現する計算ではありません。</p>
      <div className="evidence-table-scroll" role="region" aria-label="年平均試合時間の比較" tabIndex={0}>
        <table className="evidence-table"><caption>公式集計5シーズンと終了見込み{rules.matchEndEarliestAfterMinutes}〜{rules.matchEndLatestAfterMinutes}分の照合</caption><thead><tr><th scope="col">J1</th><th scope="col">平均試合時間</th><th scope="col">15分加算後</th><th scope="col">範囲との関係</th></tr></thead><tbody>{report.seasons.map(season => <tr key={season.year}><th scope="row">{season.year}年</th><td data-label="平均試合時間">{minuteSeconds(season.gameSeconds)}</td><td data-label="15分加算後">{minuteSeconds(season.elapsedSeconds)}</td><td data-label="範囲との関係">{season.withinEstimate ? '範囲内' : '範囲外'}</td></tr>)}</tbody></table>
      </div>
      <p className="small muted">年平均5点の比較です。個別試合の分布や信頼区間は推定していません。ボールが動いていた時間を示すAPTは、この試合時間とは別です。</p>
      <div className="evidence-links"><ReferenceLink evidence={evidence} id={evidence.duration.sourceId} /><ReferenceLink evidence={evidence} id={evidence.duration.halftimeSourceId} /></div>
    </section>

    <section className="spaced" aria-labelledby="observed-title"><h2 id="observed-title">観測資料から分かった限界</h2><div className="observation-grid spaced">
      <article className="panel"><p className="eyebrow">等々力・2024年3〜10月</p><h3>エリア推計では、5分単位の境界は判定できません</h3><p>駅周辺の人流は開始{Math.abs(evidence.todoroki.arrivalPeakMinutes)}分前がピークで、開始{evidence.todoroki.departureReportedUntilMinutes}分後まで減少する様子が報告されています。</p><p>新丸子駅の現行計算は徒歩{report.todoroki.walkMinutes}分を使い、帰宅の終端が開始{report.todoroki.modelDepartureEnd}分後です。資料は約500m四方・{evidence.todoroki.grainMinutes}分単位の推計なので、この差を予測誤差として評価できません。</p><p className="small muted">観戦者以外も含むエリア内の滞在人口です。駅の改札通過人数や待ち時間とは異なります。</p><div className="evidence-links"><ReferenceLink evidence={evidence} id={evidence.todoroki.sourceId} /></div></article>
      <article className="panel"><p className="eyebrow">国立競技場・{evidence.kokuritsu.date}</p><h3>早期退場の観測を、帰宅の始点に反映しました</h3><p>{evidence.kokuritsu.kickoff}開始・{minuteClock(gateKickoff + evidence.kokuritsu.endMinutes)}終了の1試合で、約{minuteClock(gateKickoff + evidence.kokuritsu.earlyExitMinutes)}からの退場が報告されています。見直し前の退場開始の仮定は{minuteClock(gateKickoff + report.baselineDepartureStartAfterMinutes)}で、この観測より{report.baselineEarlyExitGapMinutes}分後でした。</p><p>見直し後は{minuteClock(gateKickoff + report.departureStartAfterMinutes)}から退場すると仮定し、公式徒歩分数を加えて各駅の帰宅時間帯を計算します。ゲートの観測値を、駅到着の実測値としては扱いません。</p><p>資料では{minuteClock(gateKickoff + evidence.kokuritsu.exitCompleteMinutes)}に退場完了と報告されています。1試合の結果で再現性は未確認のため、すべての退場を含む保証はありません。</p><div className="evidence-links"><ReferenceLink evidence={evidence} id={evidence.kokuritsu.sourceId} /></div></article>
    </div></section>

    <section className="panel spaced" aria-labelledby="transport-title"><h2 id="transport-title">飛田給駅の運行案内との比較</h2>
      <p>味の素スタジアムのJ1昼開催・夜開催の2試合を照合しました。試合前は飛田給駅への到着、試合後は同駅からの出発を使用しています。徒歩{report.transport[0].walkMinutes}分は現在の公式アクセス案内の値です。</p>
      <p className="info-note">対象は来場{report.plannedArrivals}本・帰宅{report.plannedDepartures}本の運行計画です。実際の運行時刻、乗客数、混雑の観測値ではありません。</p>
      <div className="evidence-table-scroll" role="region" aria-label="運行案内時刻の包含検査" tabIndex={0}><table className="evidence-table"><caption>参考時間帯の始点は含み、終端は含みません。時刻は日本時間です。</caption><thead><tr><th scope="col">開催日・開始</th><th scope="col">方向</th><th scope="col">案内時刻の範囲</th><th scope="col">見直し前の時間帯</th><th scope="col">見直し後の時間帯</th><th scope="col">区間内／対象</th></tr></thead><tbody>{report.transport.flatMap(item => (['arrival', 'departure'] as const).map(kind => <tr key={`${item.sourceId}-${kind}`}><th scope="row">{item.date}<br />{item.kickoff}開始</th><td data-label="方向">{kind === 'arrival' ? '来場・駅到着' : '帰宅・駅出発'}</td><td data-label="案内時刻の範囲">{minuteClock(item[kind].first)}〜{minuteClock(item[kind].last)}</td><td data-label="見直し前の時間帯">{minuteClock(item[kind === 'arrival' ? 'baselineArrival' : 'baselineDeparture'].start)}〜{minuteClock(item[kind === 'arrival' ? 'baselineArrival' : 'baselineDeparture'].end)}</td><td data-label="見直し後の時間帯">{minuteClock(item[kind].start)}〜{minuteClock(item[kind].end)}</td><td data-label="区間内／対象">{item[kind].included}／{item[kind].count}本</td></tr>))}</tbody></table></div>
      <p className="small muted">同じ時刻でも上下線の別列車は別々に数えています。通常列車は対象外です。2試合とも同じ会場・駅のため、全国の代表標本ではありません。旧ルールは{evidence.baselineReview?.ruleVersion ?? evidence.reviewedRuleVersion}です。</p>
      {report.transport.map(item => <details className="evidence-detail" key={item.sourceId}><summary>{item.date}の照合に使った全時刻</summary><dl>{([
        ['来場・下り到着', item.arrivalDown], ['来場・上り到着', item.arrivalUp], ['帰宅・下り出発', item.departureDown], ['帰宅・上り出発', item.departureUp],
      ] as const).map(([label, times]) => <div key={label}><dt>{label}</dt><dd>{times.join('、')}</dd></div>)}</dl><ReferenceLink evidence={evidence} id={item.sourceId} /></details>)}
    </section>
  </>;
}

export function SourcesPage() {
  const { data, route } = useApp();
  let evidence: TimeEvidence;
  try {
    evidence = validateTimeEvidence(rawEvidence);
    if (data.meta.mode === 'j1') buildTimeValidation(data.rules, data.accessLinks, evidence);
  } catch {
    return <><h1 tabIndex={-1}>検証・参照リンク</h1><p className="info-note" role="alert">検証資料を読み込めませんでした。資料ファイルと比較に必要な徒歩時間を確認し、再読み込みしてください。</p><a className="back-link" href={routeUrl('/search', route)}>検索に戻る</a><button onClick={() => location.reload()}>再読み込み</button></>;
  }
  const scheduleSources = data.sources.filter(source => source.purpose === 'match_schedule');
  return <div className="sources-page">
    <a className="back-link" href={routeUrl('/search', route)}>← 検索結果に戻る</a>
    <p className="eyebrow">時間帯の根拠と参照URL</p><h1 tabIndex={-1}>検証・参照リンク</h1>
    <p className="muted spaced">資料確認日：{evidence.reviewedOn} · 照合時の計算ルール：{evidence.reviewedRuleVersion}</p>
    <button className="spaced" onClick={() => { const heading = document.getElementById('references-title'); heading?.focus({ preventScroll: true }); heading?.scrollIntoView({ block: 'start' }); }}>参照URL一覧へ</button>
    {data.meta.mode === 'demo' ? <section className="panel spaced"><h2>この検証はJ1実データの参考計算が対象です</h2><p>現在は架空のデモを表示しています。デモの日程・移動分数を実測資料で検証したものではありません。</p><a className="back-link" href={`?data=j1${routeUrl('/sources', route)}`}>J1の検証結果を開く</a></section> : <TimeComparison data={data} evidence={evidence} />}
    <section className="spaced" aria-labelledby="references-title"><h2 id="references-title" tabIndex={-1}>時間の検証に使用した参照URL（{evidence.sources.length}件）</h2><p className="muted small">各リンクは新しいタブで開きます。資料の対象期間と、判断に使える範囲を併記しています。</p>
      <ol className="reference-list">{evidence.sources.map(source => <li className="panel reference-card" key={source.id}><p className="eyebrow">{source.kind} · {source.publisher}</p><h3>{source.title}</h3><p className="small muted">対象：{source.period}<br />掲載箇所：{source.location}</p><p>{source.finding}</p><p><strong>今回の使い方：</strong>{source.use}</p><p><strong>限界：</strong>{source.limitation}</p><a className="source-url" href={source.url} target="_blank" rel="noopener noreferrer">{source.url}</a>{source.relatedUrl && <a className="source-url" href={source.relatedUrl} target="_blank" rel="noopener noreferrer">調査の紹介ページ：{source.relatedUrl}</a>}</li>)}</ol>
    </section>
    <section className="spaced" aria-labelledby="schedule-sources-title"><h2 id="schedule-sources-title">日程・会場・駅の参照URL</h2><p className="muted small">以下は日程とアクセスの出典です。来場・帰宅の共通係数を裏付ける資料とは区別しています。</p>
      <details className="panel spaced evidence-detail"><summary>会場の公式アクセス（{data.stadiums.length}件）</summary><ul className="venue-list">{data.stadiums.map(stadium => <li key={stadium.id}><strong>{stadium.name}</strong><span>{data.accessLinks.filter(link => link.stadiumId === stadium.id).map(link => data.stations.find(station => station.id === link.stationId)?.name + '駅').join('・')}</span><span className="small muted">確認日：{data.sources.find(source => source.id === stadium.accessSourceId)?.checkedOn}</span><a className="source-url" href={stadium.accessUrl} target="_blank" rel="noopener noreferrer">{stadium.accessUrl}</a></li>)}</ul></details>
      {!!scheduleSources.length && <details className="panel spaced evidence-detail"><summary>J1各試合の公式日程（{scheduleSources.length}件）</summary><ul className="venue-list">{scheduleSources.map(source => <li key={source.id}><strong>{source.title}</strong><span className="small muted">確認日：{source.checkedOn}</span><a className="source-url" href={source.url} target="_blank" rel="noopener noreferrer">{source.url}</a></li>)}</ul></details>}
    </section>
  </div>;
}
