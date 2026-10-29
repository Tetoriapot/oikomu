import type { DemoDataset } from '../domain/types';
import { validDate, validTime } from '../domain/dates.ts';

const officialHosts = new Set([
  'www.ajinomotostadium.com', 'www.nissan-stadium.jp', 'www.stadium2002.com', 'jefunited.co.jp', 'reysol.co.jp',
  'www.jleague.jp', 'www.rintetsu.co.jp', 'www.mito-hollyhock.net', 'www.nozuta-park.com', 'jns-e.com',
  'www.frontale.co.jp', 'www.s-pulse.co.jp', 'www.nagoya-grampus.jp', 'nagoya-grampus.jp',
  'sangastadium-by-kyocera.jp', 'www.gamba-osaka.net', 'www.cerezo.jp', 'nagaipark.com',
  'www.noevir-stadium.jp', 'www.fagiano-okayama.com', 'www.sanfrecce.co.jp', 'www.avispa.co.jp',
  'www.nagasakistadiumcity.com',
]);
export function safeAccessUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && officialHosts.has(url.hostname) && !url.username && !url.password && !url.port;
  } catch { return false; }
}
function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(`データの形式が正しくありません。${message}`);
}
function object(value: unknown): asserts value is Record<string, unknown> {
  assert(value && typeof value === 'object' && !Array.isArray(value), 'オブジェクトを確認してください。');
}
function string(value: unknown): asserts value is string { assert(typeof value === 'string', '文字列を確認してください。'); }
function strings(value: unknown): void { assert(Array.isArray(value) && value.every(x => typeof x === 'string'), '文字列の配列を確認してください。'); }

export function validateDataset(input: unknown): DemoDataset {
  object(input);
  object(input.meta); object(input.rules);
  for (const key of ['regions', 'stations', 'stadiums', 'teams', 'matches', 'sources', 'accessLinks', 'coverage']) {
    assert(Array.isArray(input[key]), `${key}がありません。`);
    for (const row of input[key]) object(row);
  }
  // Check all consumed scalar fields before narrowing the structural contract.
  const fields: Record<string, string[]> = {
    regions: ['id', 'name'], stations: ['id', 'name', 'kana', 'regionId'],
    stadiums: ['id', 'name', 'regionId', 'accessSourceId', 'accessUrl'],
    teams: ['id', 'name', 'defaultStadiumId'], sources: ['id', 'title', 'url', 'checkedOn', 'purpose'],
    matches: ['id', 'competitionName', 'homeTeamId', 'awayTeamId', 'matchDate', 'status', 'note'],
    accessLinks: ['stadiumId', 'stationId', 'basis'], coverage: ['stadiumId', 'startDate', 'endDate', 'state'],
  };
  for (const [key, keys] of Object.entries(fields)) {
    const rows = input[key] as Record<string, unknown>[];
    for (const row of rows) {
      for (const field of keys) string(row[field]);
      if (['regions', 'stations', 'stadiums'].includes(key)) strings(row.aliases);
    }
  }
  for (const key of ['createdOn', 'referenceDate', 'rangeStart', 'rangeEnd', 'notice']) string(input.meta[key]);
  const data = input as unknown as DemoDataset;
  const demo = data.meta.mode === 'demo';
  assert(((demo && data.meta.schemaVersion === 1) || (data.meta.mode === 'j1' && data.meta.schemaVersion === 2)) && data.meta.timeZone === 'Asia/Tokyo', 'データ設定を確認してください。');
  const timestamp = (value: unknown) => typeof value === 'string' && /(Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
  if (!demo) {
    assert(typeof data.meta.season === 'string' && /^\d{4}-\d{2}$/.test(data.meta.season), 'シーズンが不正です。');
    assert(timestamp(data.meta.updatedAt) && data.meta.scheduleUrl && safeAccessUrl(data.meta.scheduleUrl) && Number.isInteger(data.meta.freshnessDays) && data.meta.freshnessDays! > 0, '更新情報が不正です。');
  }
  for (const value of [data.meta.createdOn, data.meta.referenceDate, data.meta.rangeStart, data.meta.rangeEnd]) assert(validDate(value), '日付が不正です。');
  assert(data.meta.rangeStart <= data.meta.referenceDate && data.meta.referenceDate <= data.meta.rangeEnd, '収録期間が不正です。');
  const ids = new Set<string>();
  for (const rows of [data.regions, data.stations, data.stadiums, data.teams, data.matches, data.sources]) {
    for (const row of rows) { assert(row.id && !ids.has(row.id), 'IDが空か重複しています。'); ids.add(row.id); }
  }
  const has = (rows: { id: string }[], id: string | null) => rows.some(x => x.id === id);
  for (const station of data.stations) assert(has(data.regions, station.regionId) && Number.isInteger(station.sortOrder), '駅の参照が不正です。');
  for (const source of data.sources) assert(safeAccessUrl(source.url) && validDate(source.checkedOn) && (source.purpose === 'venue_station_reference' || (!demo && source.purpose === 'match_schedule' && new URL(source.url).hostname === 'www.jleague.jp')), '出典が不正です。');
  for (const stadium of data.stadiums) assert(has(data.regions, stadium.regionId) && data.sources.some(s => s.id === stadium.accessSourceId && s.purpose === 'venue_station_reference' && s.url === stadium.accessUrl) && safeAccessUrl(stadium.accessUrl), '会場の参照が不正です。');
  for (const team of data.teams) assert(has(data.stadiums, team.defaultStadiumId) && team.isDemo === demo, 'チームの参照が不正です。');
  const links = new Set<string>();
  for (const link of data.accessLinks) {
    const key = `${link.stadiumId}:${link.stationId}`;
    assert(!links.has(key) && has(data.stations, link.stationId) && has(data.stadiums, link.stadiumId), '駅と会場の対応が不正です。');
    if (demo) assert(Number.isFinite(link.demoWalkMinutes) && link.demoWalkMinutes! >= 0 && link.basis === 'demo_assumption', 'デモ移動分数が不正です。');
    else {
      assert(link.basis === 'official_access' && ['walk', 'bus'].includes(link.accessMode ?? '') && typeof link.accessNote === 'string' && !!link.accessNote && link.checkedOn && validDate(link.checkedOn), 'アクセス情報が不正です。');
      assert(link.walkMinutes === null || (Number.isFinite(link.walkMinutes) && link.walkMinutes! >= 0), '徒歩分数が不正です。');
      assert(link.accessMode !== 'bus' || link.walkMinutes === null, 'バスの移動時間を徒歩時間として使用できません。');
      assert(data.sources.some(s => s.id === link.sourceId && s.purpose === 'venue_station_reference'), 'アクセスの出典がありません。');
    }
    links.add(key);
  }
  const covered = new Set<string>();
  for (const coverage of data.coverage) {
    assert(!covered.has(coverage.stadiumId) && has(data.stadiums, coverage.stadiumId) && validDate(coverage.startDate) && validDate(coverage.endDate) && coverage.startDate <= coverage.endDate && coverage.startDate >= data.meta.rangeStart && coverage.endDate <= data.meta.rangeEnd && coverage.state === (demo ? 'demo_complete' : 'official_snapshot'), '収録範囲が不正です。');
    covered.add(coverage.stadiumId);
  }
  for (const stadium of data.stadiums) assert(covered.has(stadium.id) && data.accessLinks.some(l => l.stadiumId === stadium.id), '会場の収録範囲または駅がありません。');
  for (const match of data.matches) {
    assert(has(data.teams, match.homeTeamId) && has(data.teams, match.awayTeamId) && match.homeTeamId !== match.awayTeamId && match.isDemo === demo, '試合の参照が不正です。');
    if (demo) assert(match.sourceId === null, 'サンプルの出典はnullです。');
    else {
      assert(data.sources.some(s => s.id === match.sourceId && s.purpose === 'match_schedule'), '公式日程の出典がありません。');
      assert(timestamp(match.checkedAt) && Date.parse(match.checkedAt!) <= Date.parse(data.meta.updatedAt!) && Number.isInteger(match.round) && match.round! >= 1 && match.round! <= 38, '試合の確認日時・節が不正です。');
      for (const key of ['candidateDates', 'conditionalDates'] as const) {
        strings(match[key]);
        const dates = match[key]!;
        assert(new Set(dates).size === dates.length && dates.every(d => validDate(d) && d >= data.meta.rangeStart && d <= data.meta.rangeEnd), '候補日が不正です。');
      }
      assert(match.status === 'date_tbd' ? match.candidateDates!.length >= 2 && match.candidateDates!.includes(match.matchDate) && !!match.note : match.candidateDates!.length === 0, '日程未定と候補日が一致しません。');
    }
    assert(validDate(match.matchDate) && match.matchDate >= data.meta.rangeStart && match.matchDate <= data.meta.rangeEnd, '試合の日付が不正です。');
    assert(['scheduled', 'time_tbd', 'venue_tbd', 'postponed', 'cancelled', ...(!demo ? ['date_tbd', 'completed'] : [])].includes(match.status), '試合の状態が不正です。');
    assert(match.status === 'venue_tbd' ? match.stadiumId === null : match.status === 'date_tbd' ? match.stadiumId === null || has(data.stadiums, match.stadiumId) : has(data.stadiums, match.stadiumId), '会場と状態が一致しません。');
    assert(['scheduled', 'completed'].includes(match.status) ? typeof match.kickoffLocalTime === 'string' && validTime(match.kickoffLocalTime) : match.kickoffLocalTime === null, '時刻と状態が一致しません。');
    if (match.stadiumId) assert(data.coverage.some(c => c.stadiumId === match.stadiumId && c.startDate <= match.matchDate && match.matchDate <= c.endDate), '試合が収録範囲外です。');
    assert(Array.isArray(match.history), '変更履歴が不正です。');
    let previous = '';
    for (const change of match.history) {
      object(change); string(change.note); string(change.changedAt);
      assert(['matchDate', 'stadiumId', 'kickoffLocalTime'].includes(change.field), '変更項目が不正です。');
      assert(/(Z|[+-]\d{2}:\d{2})$/.test(change.changedAt) && Number.isFinite(Date.parse(change.changedAt)) && (!previous || Date.parse(previous) <= Date.parse(change.changedAt)), '変更時刻が不正です。');
      previous = change.changedAt;
      for (const value of [change.fromValue, change.toValue]) {
        assert(value === null || typeof value === 'string', '変更値が不正です。');
        if (change.field === 'matchDate') assert(value !== null && validDate(value), '変更日が不正です。');
        if (change.field === 'stadiumId') assert(value === null || has(data.stadiums, value), '変更会場が不正です。');
        if (change.field === 'kickoffLocalTime') assert(value === null || validTime(value), '変更時刻が不正です。');
      }
    }
    const snapshot = { matchDate: match.matchDate, stadiumId: match.stadiumId, kickoffLocalTime: match.kickoffLocalTime };
    for (const change of [...match.history].reverse()) {
      assert(snapshot[change.field] === change.toValue, '変更履歴と現在の値が一致しません。');
      Object.assign(snapshot, { [change.field]: change.fromValue });
    }
  }
  const r = data.rules;
  string(r.version);
  for (const value of [r.arrivalStartBeforeMinutes, r.arrivalEndBeforeMinutes, r.matchEndEarliestAfterMinutes, r.matchEndLatestAfterMinutes, r.departureTailMinutes]) assert(Number.isFinite(value) && value >= 0, '計算係数が不正です。');
  assert(r.validatedForRealUse === false && r.arrivalStartBeforeMinutes > r.arrivalEndBeforeMinutes && r.matchEndEarliestAfterMinutes <= r.matchEndLatestAfterMinutes, '計算条件が不正です。');
  if (r.earlyDepartureAfterMinutes !== undefined) assert(Number.isSafeInteger(r.earlyDepartureAfterMinutes) && r.earlyDepartureAfterMinutes >= 0 && r.earlyDepartureAfterMinutes <= r.matchEndEarliestAfterMinutes, '早期退場の係数が不正です。');
  return data;
}

