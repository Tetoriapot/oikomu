import type { DemoRules } from './types';

export type TimeRuleSnapshot = Pick<DemoRules, 'arrivalStartBeforeMinutes' | 'arrivalEndBeforeMinutes' | 'matchEndEarliestAfterMinutes' | 'matchEndLatestAfterMinutes' | 'departureTailMinutes' | 'earlyDepartureAfterMinutes'>;

export interface TimeEvidenceSource {
  id: string; title: string; publisher: string; url: string; relatedUrl?: string;
  period: string; kind: string; location: string; finding: string; use: string; limitation: string;
}
export interface TransportCase {
  sourceId: string; date: string; kickoff: string; stadiumId: string; stationId: string;
  arrivalDown: string[]; arrivalUp: string[]; departureDown: string[]; departureUp: string[];
}
export interface TimeEvidence {
  schemaVersion: 1; reviewedOn: string; reviewedRuleVersion: string; sources: TimeEvidenceSource[];
  reviewedRules: TimeRuleSnapshot;
  baselineReview?: { ruleVersion: string; rules: TimeRuleSnapshot };
  duration: { sourceId: string; halftimeSourceId: string; halftimeSeconds: number; seasons: { year: number; gameSeconds: number }[] };
  todoroki: { sourceId: string; arrivalPeakMinutes: number; departureReportedUntilMinutes: number; grainMinutes: number; stationId: string; stadiumId: string };
  kokuritsu: { sourceId: string; date: string; kickoff: string; earlyExitMinutes: number; endMinutes: number; exitCompleteMinutes: number };
  transportCases: TransportCase[];
}
