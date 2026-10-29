import type { AccessLink, DemoRules } from './types';
import type { TimeEvidence } from '../../../contracts/time-evidence';

export const clockMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
export function minuteClock(value: number): string {
  const days = Math.floor(value / 1440);
  const minutes = ((value % 1440) + 1440) % 1440;
  const clock = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  return days === 0 ? clock : `${days === 1 ? '翌日' : days === -1 ? '前日' : `${days}日後`} ${clock}`;
}
export const minuteSeconds = (seconds: number) => `${Math.floor(seconds / 60)}分${String(seconds % 60).padStart(2, '0')}秒`;
export const inInterval = (value: number, start: number, end: number) => value >= start && value < end;

// Independent arithmetic for the published evidence; do not call the production window calculator here.
export function buildTimeValidation(rules: DemoRules, links: AccessLink[], evidence: TimeEvidence) {
  for (const key of ['arrivalStartBeforeMinutes', 'arrivalEndBeforeMinutes', 'matchEndEarliestAfterMinutes', 'matchEndLatestAfterMinutes', 'departureTailMinutes'] as const) {
    if (!Number.isSafeInteger(rules[key]) || rules[key] < 0) throw new Error('時間帯の計算係数が不正です。');
  }
  if (rules.arrivalStartBeforeMinutes <= rules.arrivalEndBeforeMinutes || rules.matchEndEarliestAfterMinutes > rules.matchEndLatestAfterMinutes) throw new Error('時間帯の計算区間が不正です。');
  const departureStart = rules.earlyDepartureAfterMinutes ?? rules.matchEndEarliestAfterMinutes;
  if (!Number.isSafeInteger(departureStart) || departureStart < 0 || departureStart > rules.matchEndEarliestAfterMinutes) throw new Error('早期退場の係数が不正です。');
  const baselineRules = evidence.baselineReview?.rules ?? evidence.reviewedRules;
  const baselineDepartureStart = baselineRules.earlyDepartureAfterMinutes ?? baselineRules.matchEndEarliestAfterMinutes;
  const walk = (stadiumId: string, stationId: string) => {
    const link = links.find(item => item.stadiumId === stadiumId && item.stationId === stationId);
    if (link?.basis !== 'official_access' || link.accessMode !== 'walk' || !Number.isSafeInteger(link.walkMinutes) || link.walkMinutes! < 0) throw new Error('比較に必要な公式徒歩時間がありません。');
    return link.walkMinutes!;
  };
  const seasons = evidence.duration.seasons.map(season => {
    const elapsedSeconds = season.gameSeconds + evidence.duration.halftimeSeconds;
    return { ...season, elapsedSeconds, withinEstimate: elapsedSeconds >= rules.matchEndEarliestAfterMinutes * 60 && elapsedSeconds <= rules.matchEndLatestAfterMinutes * 60 };
  });
  const transport = evidence.transportCases.map(item => {
    const kickoff = clockMinutes(item.kickoff);
    const walkMinutes = walk(item.stadiumId, item.stationId);
    const compare = (times: string[], start: number, end: number) => ({
      start, end, first: Math.min(...times.map(clockMinutes)), last: Math.max(...times.map(clockMinutes)),
      count: times.length, included: times.filter(time => inInterval(clockMinutes(time), start, end)).length,
    });
    return { ...item, walkMinutes,
      arrival: compare([...item.arrivalDown, ...item.arrivalUp], kickoff - rules.arrivalStartBeforeMinutes, kickoff - rules.arrivalEndBeforeMinutes),
      baselineArrival: compare([...item.arrivalDown, ...item.arrivalUp], kickoff - baselineRules.arrivalStartBeforeMinutes, kickoff - baselineRules.arrivalEndBeforeMinutes),
      departure: compare([...item.departureDown, ...item.departureUp], kickoff + departureStart + walkMinutes, kickoff + rules.matchEndLatestAfterMinutes + walkMinutes + rules.departureTailMinutes),
      baselineDeparture: compare([...item.departureDown, ...item.departureUp], kickoff + baselineDepartureStart + walkMinutes, kickoff + baselineRules.matchEndLatestAfterMinutes + walkMinutes + baselineRules.departureTailMinutes),
    };
  });
  const todorokiWalk = walk(evidence.todoroki.stadiumId, evidence.todoroki.stationId);
  return {
    reviewedOn: evidence.reviewedOn, ruleVersion: rules.version,
    reviewIsCurrent: rules.version === evidence.reviewedRuleVersion && (['arrivalStartBeforeMinutes', 'arrivalEndBeforeMinutes', 'matchEndEarliestAfterMinutes', 'matchEndLatestAfterMinutes', 'departureTailMinutes', 'earlyDepartureAfterMinutes'] as const).every(key => rules[key] === evidence.reviewedRules[key]),
    seasons, transport,
    plannedArrivals: transport.reduce((sum, item) => sum + item.arrival.count, 0),
    plannedDepartures: transport.reduce((sum, item) => sum + item.departure.count, 0),
    todoroki: { peakIncluded: inInterval(evidence.todoroki.arrivalPeakMinutes, -rules.arrivalStartBeforeMinutes, -rules.arrivalEndBeforeMinutes), modelDepartureEnd: rules.matchEndLatestAfterMinutes + todorokiWalk + rules.departureTailMinutes, walkMinutes: todorokiWalk },
    departureStartAfterMinutes: departureStart,
    baselineDepartureStartAfterMinutes: baselineDepartureStart,
    earlyExitGapMinutes: departureStart - evidence.kokuritsu.earlyExitMinutes,
    baselineEarlyExitGapMinutes: baselineDepartureStart - evidence.kokuritsu.earlyExitMinutes,
    predictionAccuracy: null,
  };
}
