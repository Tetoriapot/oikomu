import type { AccessLink, DemoRules, Match, TimeWindow } from './types';
import { addDays, dayStart, toJst } from './dates';

export function calculationReason(match: Match, link?: AccessLink): string | null {
  if (match.status !== 'scheduled') return match.status;
  if (!match.stadiumId || !match.kickoffLocalTime || !link || link.stadiumId !== match.stadiumId) return 'missing_access';
  if (!match.isDemo && (link.accessMode !== 'walk' || link.walkMinutes == null)) return 'missing_walk_minutes';
  return null;
}
export function departureStartAfterMinutes(rules: DemoRules, isDemo: boolean): number {
  return isDemo ? rules.matchEndEarliestAfterMinutes : rules.earlyDepartureAfterMinutes ?? rules.matchEndEarliestAfterMinutes;
}
export function calculateWindows(match: Match, link: AccessLink, rules: DemoRules): TimeWindow[] {
  if (calculationReason(match, link)) return [];
  const kickoff = Date.parse(`${match.matchDate}T${match.kickoffLocalTime}:00+09:00`);
  const walkMinutes = match.isDemo ? link.demoWalkMinutes! : link.walkMinutes!;
  const window = (kind: TimeWindow['kind'], start: number, end: number): TimeWindow => ({
    kind, start: toJst(kickoff + start * 60_000), end: toJst(kickoff + end * 60_000), matchIds: [match.id], ruleVersion: rules.version,
  });
  return [
    window('arrival', -rules.arrivalStartBeforeMinutes, -rules.arrivalEndBeforeMinutes),
    window('departure', departureStartAfterMinutes(rules, match.isDemo) + walkMinutes, rules.matchEndLatestAfterMinutes + walkMinutes + rules.departureTailMinutes),
  ];
}
export function clipToDay(window: TimeWindow, date: string): TimeWindow | null {
  const start = Math.max(Date.parse(window.start), dayStart(date));
  const end = Math.min(Date.parse(window.end), dayStart(addDays(date, 1)));
  return start < end ? { ...window, start: toJst(start), end: toJst(end) } : null;
}
export function mergeWindows(windows: TimeWindow[]): TimeWindow[] {
  const result: TimeWindow[] = [];
  for (const kind of ['arrival', 'departure'] as const) {
    const sorted = windows.filter(w => w.kind === kind).sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
    for (const window of sorted) {
      const last = result.at(-1);
      if (last && last.kind === kind && Date.parse(window.start) <= Date.parse(last.end)) {
        if (Date.parse(window.end) > Date.parse(last.end)) last.end = window.end;
        last.matchIds = [...new Set([...last.matchIds, ...window.matchIds])];
      } else result.push({ ...window, matchIds: [...window.matchIds] });
    }
  }
  return result;
}
