import { describe, expect, it } from 'vitest';
import rawEvidence from '../../../data/time-evidence.json';
import { getDataset } from '../../src/data/repository';
import { validateTimeEvidence } from '../../src/data/validateTimeEvidence';
import { buildTimeValidation, inInterval, minuteClock, minuteSeconds } from '../../src/domain/timeValidation';
import { calculateWindows } from '../../src/domain/windows';
import type { Match } from '../../src/domain/types';

const evidence = validateTimeEvidence(rawEvidence);
const data = getDataset();
const report = buildTimeValidation(data.rules, data.accessLinks, evidence);

describe('historical time evidence', () => {
  it('converts five annual means with one halftime and does not claim prediction accuracy', () => {
    expect(report.seasons.map(item => item.elapsedSeconds)).toEqual([6798, 6791, 6870, 6945, 6930]);
    expect(report.seasons.every(item => item.withinEstimate)).toBe(true);
    expect(report.predictionAccuracy).toBeNull();
    expect(data.rules.validatedForRealUse).toBe(false);
    expect(minuteSeconds(6798)).toBe('113分18秒');
  });
  it('retains separate trains in both directions, including the simultaneous 14:20 arrivals', () => {
    expect(report.plannedArrivals).toBe(27); expect(report.plannedDepartures).toBe(22);
    expect(report.transport.map(item => [item.arrival.count, item.arrival.included, item.departure.count, item.departure.included])).toEqual([[13, 13, 11, 11], [14, 14, 11, 11]]);
    expect([...report.transport[0].arrivalDown, ...report.transport[0].arrivalUp].filter(time => time === '14:20')).toHaveLength(2);
  });
  it('compares historical plans with actual production windows independently', () => {
    expect(report.transport.map(item => [item.arrival.start, item.arrival.end, item.departure.start, item.departure.end].map(minuteClock))).toEqual([
      ['12:30', '14:45', '16:05', '18:45'], ['16:30', '18:45', '20:05', '22:45'],
    ]);
    for (const item of report.transport) {
      // Scheduled only to exercise the formula against a historical fixture, not to import it as upcoming.
      const match: Match = { ...data.matches[0], matchDate: item.date, kickoffLocalTime: item.kickoff, stadiumId: item.stadiumId, status: 'scheduled' };
      const link = data.accessLinks.find(link => link.stadiumId === item.stadiumId && link.stationId === item.stationId)!;
      const windows = calculateWindows(match, link, data.rules);
      for (const window of windows) {
        const result = item[window.kind];
        expect(window.start.slice(11, 16)).toBe(minuteClock(result.start));
        expect(window.end.slice(11, 16)).toBe(minuteClock(result.end));
      }
    }
  });
  it('excludes the exact terminal time and observes times outside the window', () => {
    expect(inInterval(100, 100, 110)).toBe(true); expect(inInterval(110, 100, 110)).toBe(false);
    const changed = structuredClone(evidence);
    changed.transportCases[0].arrivalDown.push('12:29', '12:30', '14:45');
    expect(buildTimeValidation(data.rules, data.accessLinks, changed).transport[0].arrival).toMatchObject({ count: 16, included: 14 });
    expect(minuteClock(1450)).toBe('翌日 00:10'); expect(minuteClock(-10)).toBe('前日 23:50');
  });
  it('separates a gate observation from station timing and hourly population estimates', () => {
    expect(report.earlyExitGapMinutes).toBe(0);
    expect(report.baselineEarlyExitGapMinutes).toBe(50);
    expect(report.transport.map(item => [item.baselineDeparture.start, item.baselineDeparture.end].map(minuteClock))).toEqual([['16:55', '18:45'], ['20:55', '22:45']]);
    expect(report.todoroki).toEqual({ peakIncluded: true, modelDepartureEnd: 235, walkMinutes: 15 });
    expect(evidence.todoroki.grainMinutes).toBe(60);
    expect(evidence.todoroki.departureReportedUntilMinutes).toBe(240);
  });
  it('detects changed coefficients even if the version string is unchanged', () => {
    expect(report.reviewIsCurrent).toBe(true);
    expect(buildTimeValidation({ ...data.rules, arrivalStartBeforeMinutes: 149 }, data.accessLinks, evidence).reviewIsCurrent).toBe(false);
    expect(buildTimeValidation({ ...data.rules, version: 'new' }, data.accessLinks, evidence).reviewIsCurrent).toBe(false);
    expect(buildTimeValidation({ ...data.rules, earlyDepartureAfterMinutes: 59 }, data.accessLinks, evidence).reviewIsCurrent).toBe(false);
    expect(buildTimeValidation({ ...data.rules, earlyDepartureAfterMinutes: undefined }, data.accessLinks, evidence).reviewIsCurrent).toBe(false);
  });
  it('requires an official walking duration instead of substituting a demo or bus duration', () => {
    expect(() => buildTimeValidation(data.rules, [], evidence)).toThrow('徒歩時間');
    const changed = data.accessLinks.map(link => ({ ...link, basis: 'demo_assumption' as const }));
    expect(() => buildTimeValidation(data.rules, changed, evidence)).toThrow('徒歩時間');
  });
  it('preserves unknown metadata while validating every consumed field', () => {
    const extended = { ...rawEvidence, authorNote: 'keep' };
    expect(validateTimeEvidence(extended)).toBe(extended);
  });
  it.each(['empty', 'version', 'date', 'unsafe', 'relatedUnsafe', 'duplicateSource', 'missingSource', 'missingTimes', 'badTime', 'duplicateTrain', 'overnight', 'badMean', 'duplicateSeason', 'coefficients'])('rejects invalid evidence: %s', kind => {
    const bad = structuredClone(rawEvidence);
    if (kind === 'empty') { expect(() => validateTimeEvidence(null)).toThrow(); return; }
    if (kind === 'version') bad.schemaVersion = 2;
    if (kind === 'date') bad.reviewedOn = '2026-02-30';
    if (kind === 'unsafe') bad.sources[0].url = 'javascript:alert(1)';
    if (kind === 'relatedUnsafe') bad.sources[2].relatedUrl = 'http://unsafe.example/';
    if (kind === 'duplicateSource') bad.sources.push(bad.sources[0]);
    if (kind === 'missingSource') bad.duration.sourceId = 'missing';
    if (kind === 'missingTimes') bad.transportCases[0].arrivalDown = [];
    if (kind === 'badTime') bad.transportCases[0].arrivalDown[0] = '25:99';
    if (kind === 'duplicateTrain') bad.transportCases[0].arrivalDown.push('13:40');
    if (kind === 'overnight') bad.transportCases[0].departureDown.push('00:30');
    if (kind === 'badMean') bad.duration.seasons[0].gameSeconds = Number.NaN;
    if (kind === 'duplicateSeason') bad.duration.seasons.push(bad.duration.seasons[0]);
    if (kind === 'coefficients') bad.reviewedRules.departureTailMinutes = -90;
    expect(() => validateTimeEvidence(bad)).toThrow();
  });
});
