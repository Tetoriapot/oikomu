import type { TimeEvidence } from '../../../contracts/time-evidence';

function check(condition: unknown): asserts condition {
  if (!condition) throw new Error('時間検証資料の形式または出典参照が不正です。');
}
function record(value: unknown): asserts value is Record<string, unknown> { check(value !== null && typeof value === 'object' && !Array.isArray(value)); }
function list(value: unknown): asserts value is unknown[] { check(Array.isArray(value) && value.length > 0); }
function text(value: unknown): asserts value is string { check(typeof value === 'string' && value.trim().length > 0); }
function number(value: unknown): asserts value is number { check(typeof value === 'number' && Number.isSafeInteger(value)); }
function positive(value: unknown) { number(value); check(value > 0); }
function url(value: unknown) { text(value); const parsed = new URL(value); check(parsed.protocol === 'https:' && !parsed.username && !parsed.password); }
function date(value: unknown) { text(value); check(/^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value); }
function time(value: unknown) { text(value); check(/^([01]\d|2[0-3]):[0-5]\d$/.test(value)); }
function rules(value: unknown) {
  record(value);
  for (const key of ['arrivalStartBeforeMinutes', 'arrivalEndBeforeMinutes', 'matchEndEarliestAfterMinutes', 'matchEndLatestAfterMinutes', 'departureTailMinutes']) positive(value[key]);
  if (value.earlyDepartureAfterMinutes !== undefined) {
    number(value.earlyDepartureAfterMinutes); number(value.matchEndEarliestAfterMinutes);
    check(value.earlyDepartureAfterMinutes >= 0 && value.earlyDepartureAfterMinutes <= value.matchEndEarliestAfterMinutes);
  }
}

export function validateTimeEvidence(value: unknown): TimeEvidence {
  record(value); check(value.schemaVersion === 1); date(value.reviewedOn); text(value.reviewedRuleVersion);
  rules(value.reviewedRules);
  if (value.baselineReview !== undefined) { record(value.baselineReview); text(value.baselineReview.ruleVersion); rules(value.baselineReview.rules); }
  list(value.sources);
  const ids = new Set<string>();
  for (const source of value.sources) {
    record(source);
    for (const key of ['id', 'title', 'publisher', 'period', 'kind', 'location', 'finding', 'use', 'limitation']) text(source[key]);
    text(source.id); check(!ids.has(source.id)); ids.add(source.id); url(source.url);
    if (source.relatedUrl !== undefined) url(source.relatedUrl);
  }
  const reference = (id: unknown) => { text(id); check(ids.has(id)); };
  record(value.duration); reference(value.duration.sourceId); reference(value.duration.halftimeSourceId); positive(value.duration.halftimeSeconds);
  list(value.duration.seasons); const years = new Set<number>();
  for (const season of value.duration.seasons) { record(season); positive(season.year); positive(season.gameSeconds); number(season.year); check(!years.has(season.year)); years.add(season.year); }
  record(value.todoroki); reference(value.todoroki.sourceId); number(value.todoroki.arrivalPeakMinutes); positive(value.todoroki.departureReportedUntilMinutes); positive(value.todoroki.grainMinutes); text(value.todoroki.stationId); text(value.todoroki.stadiumId);
  record(value.kokuritsu); reference(value.kokuritsu.sourceId); date(value.kokuritsu.date); time(value.kokuritsu.kickoff);
  number(value.kokuritsu.earlyExitMinutes); number(value.kokuritsu.endMinutes); number(value.kokuritsu.exitCompleteMinutes);
  check(value.kokuritsu.earlyExitMinutes >= 0 && value.kokuritsu.earlyExitMinutes < value.kokuritsu.endMinutes && value.kokuritsu.endMinutes <= value.kokuritsu.exitCompleteMinutes);
  list(value.transportCases);
  for (const item of value.transportCases) {
    record(item); reference(item.sourceId); date(item.date); time(item.kickoff); text(item.stadiumId); text(item.stationId);
    for (const key of ['arrivalDown', 'arrivalUp', 'departureDown', 'departureUp']) {
      const times = item[key]; list(times); times.forEach(time); check(new Set(times).size === times.length);
      // These published schedules are on the match date. Reject ambiguous overnight additions.
      text(item.kickoff);
      for (const value of times) { text(value); check(key.startsWith('arrival') ? value < item.kickoff : value > item.kickoff); }
    }
  }
  // Every consumed field is checked above. Keep the original object to retain unknown future fields.
  return value as unknown as TimeEvidence;
}
