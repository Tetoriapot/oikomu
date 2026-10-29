import { createHash } from 'node:crypto';

// Parse JSON embedded in public server-rendered HTML; never execute page scripts.
export function flightRecords(html) {
  const chunks = [...html.matchAll(/<script>self\.__next_f\.push\((.+?)\)<\/script>/gs)]
    .map(m => JSON.parse(m[1])).filter(a => a[0] === 1 && typeof a[1] === 'string').map(a => a[1]).join('');
  if (!chunks) throw new Error('公式ページのデータ形式が変わりました。');
  return chunks.split('\n').flatMap(line => {
    const content = line.slice(line.indexOf(':') + 1);
    if (!content.startsWith('[') && !content.startsWith('{')) return [];
    try { return [JSON.parse(content)]; } catch { return []; }
  });
}
function visit(value, fn) {
  if (!value || typeof value !== 'object') return;
  fn(value);
  for (const item of Object.values(value)) visit(item, fn);
}
export function parseSchedule(html) {
  const rows = new Map();
  for (const record of flightRecords(html)) visit(record, group => {
    if (group.gameKindId !== 2 || group.leagueName !== 'j1' || !Array.isArray(group.matches)) return;
    if (!/^\$D\d{4}-\d{2}-\d{2}T/.test(group.matchDate)) throw new Error('公式日程の日付を読み取れません。');
    const round = Number(/^第(\d+)節$/.exec(group.seasonText)?.[1]);
    if (!round) throw new Error('節を読み取れません。');
    for (const m of group.matches) {
      if (!m.homeTeam?.fullName || !m.awayTeam?.fullName || !m.stadiumFullName || !m.time || !['game-over', 'ticket', 'cancelled', 'postponed'].includes(m.state)) throw new Error('未対応の試合情報が含まれています。');
      if (!/^\/match\/j1\/\d{4}\/\d{6}$/.test(m.detailHref)) throw new Error('公式試合URLが不正です。');
      const row = { officialId: m.id, date: group.matchDate.slice(2, 12), round, state: m.state, time: m.time,
        home: m.homeTeam.fullName, away: m.awayTeam.fullName, stadium: m.stadiumFullName,
        url: `https://www.jleague.jp${m.detailHref}/` };
      const old = rows.get(row.officialId);
      if (old && JSON.stringify(old) !== JSON.stringify(row)) throw new Error('公式日程内に矛盾する重複があります。');
      rows.set(row.officialId, row);
    }
  });
  if (!rows.size || rows.size >= 250) throw new Error('日程が空か、取得上限に達しました。期間を分割して確認してください。');
  return [...rows.values()];
}
export function parseDetailNote(html) {
  const notes = new Set();
  for (const record of flightRecords(html)) visit(record, value => {
    if (Object.hasOwn(value, 'afterCanceledInfo')) {
      if (typeof value.afterCanceledInfo !== 'string') throw new Error('試合注記を読み取れません。');
      notes.add(value.afterCanceledInfo);
    }
  });
  if (notes.size !== 1) throw new Error('試合注記が欠落しているか、複数の内容が含まれています。');
  return [...notes][0];
}
export function noteDates(note, season) {
  const parts = note.normalize('NFKC').split('※').filter(Boolean);
  const dates = text => [...new Set([...text.matchAll(/(\d{1,2})\/(\d{1,2})/g)].map(([, month, day]) => {
    const year = Number(season.slice(0, 4)) + (Number(month) < 7 ? 1 : 0);
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }))].sort();
  return {
    candidateDates: dates(parts.filter(p => /\bor\b/i.test(p) && !p.includes('可能性')).join(' ')),
    conditionalDates: dates(parts.filter(p => p.includes('可能性')).join(' ')),
  };
}
const normalize = value => value.normalize('NFKC').toLowerCase().replace(/\s+/g, '');
const jstDate = value => new Date(Date.parse(value) + 9 * 3_600_000).toISOString().slice(0, 10);
export function buildDataset(raw, access, previous, validate) {
  if (raw.season !== access.season || raw.matches.length !== 380) throw new Error('対象シーズンの全380試合が揃っていません。');
  const matches = [], sources = [...access.sources], pairs = new Set(), perTeam = new Map(), perRound = new Map();
  for (const row of raw.matches) {
    const home = access.teams.find(t => normalize(t.name) === normalize(row.home));
    const away = access.teams.find(t => normalize(t.name) === normalize(row.away));
    if (!home || !away || home.id === away.id) throw new Error(`クラブの対応を確認してください: ${row.home} / ${row.away}`);
    const stadium = row.stadium === '未定' ? null : access.stadiums.find(s => [s.name, ...s.aliases].some(n => normalize(n) === normalize(row.stadium)));
    if (stadium === undefined) throw new Error(`会場のアクセスを登録してください: ${row.stadium}`);
    const id = `j1-${raw.season}-${home.id.slice(5)}-${away.id.slice(5)}`;
    if (pairs.has(id)) throw new Error('同じホーム・アウェイの試合が重複しています。');
    pairs.add(id);
    perTeam.set(home.id, (perTeam.get(home.id) ?? 0) + 1);
    perRound.set(row.round, (perRound.get(row.round) ?? 0) + 1);
    const dates = noteDates(row.note, raw.season);
    const sourceId = `src-${id}`;
    sources.push({ id: sourceId, title: `Jリーグ公式 第${row.round}節 ${row.home} vs ${row.away}`, url: row.url, checkedOn: jstDate(row.checkedAt), purpose: 'match_schedule' });
    const status = row.state === 'game-over' ? 'completed' : row.state === 'cancelled' ? 'cancelled' : row.state === 'postponed' ? 'postponed' : dates.candidateDates.length ? 'date_tbd' : !stadium ? 'venue_tbd' : row.time === '未定' ? 'time_tbd' : 'scheduled';
    const match = { id, competitionName: '2026/27 明治安田J1リーグ', homeTeamId: home.id, awayTeamId: away.id,
      matchDate: row.date, kickoffLocalTime: ['scheduled', 'completed'].includes(status) ? row.time : null,
      stadiumId: stadium?.id ?? null, status, history: [], isDemo: false, sourceId, note: row.note,
      round: row.round, checkedAt: row.checkedAt, ...dates };
    const old = previous?.matches.find(m => m.id === id);
    if (old) {
      match.history = [...old.history];
      for (const field of ['matchDate', 'stadiumId', 'kickoffLocalTime']) if (old[field] !== match[field]) {
        match.history.push({ field, fromValue: old[field], toValue: match[field], changedAt: raw.updatedAt, note: '公式日程の再確認で変更を検出' });
      }
    }
    matches.push(match);
  }
  if (perTeam.size !== 20 || [...perTeam.values()].some(n => n !== 19) || perRound.size !== 38 || [...perRound.values()].some(n => n !== 10)) throw new Error('クラブ別・節別の試合数が一致しません。');
  const rangeStart = `${raw.season.slice(0, 4)}-08-01`, rangeEnd = `${Number(raw.season.slice(0, 4)) + 1}-06-30`;
  const dataset = {
    meta: { schemaVersion: 2, mode: 'j1', createdOn: previous?.meta.createdOn ?? jstDate(raw.updatedAt), timeZone: 'Asia/Tokyo',
      referenceDate: [rangeStart, jstDate(raw.updatedAt), rangeEnd].sort()[1], rangeStart, rangeEnd, season: raw.season, updatedAt: raw.updatedAt,
      scheduleUrl: `https://www.jleague.jp/j1/match/search-list/?category=j1&period=custom&startdate=${rangeStart}&enddate=${rangeEnd}`, freshnessDays: 7,
      notice: 'デモ版・実験公開中。J1公式日程の確認時点の情報です。公開版は毎日0:00（日本時間）に取得を開始します。反映の遅れや失敗があるため、最新の公式案内も確認してください。' },
    regions: access.regions, stations: access.stations, stadiums: access.stadiums, accessLinks: access.accessLinks,
    teams: access.teams, matches: matches.sort((a,b) => a.matchDate.localeCompare(b.matchDate) || a.id.localeCompare(b.id)),
    coverage: access.stadiums.map(s => ({ stadiumId: s.id, startDate: rangeStart, endDate: rangeEnd, state: 'official_snapshot' })), sources,
    rules: { version: 'reference-early-departure-v2', arrivalStartBeforeMinutes: 150, arrivalEndBeforeMinutes: 15,
      matchEndEarliestAfterMinutes: 110, matchEndLatestAfterMinutes: 130, earlyDepartureAfterMinutes: 60, departureTailMinutes: 90, validatedForRealUse: false },
  };
  return validate(dataset);
}
export const sha256 = text => createHash('sha256').update(text).digest('hex');
