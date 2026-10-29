// オイコム デモの入力契約。型だけではJSONの実行時検証にならない。
export type DateKey = string; // 実在する YYYY-MM-DD を実行時に検証
export type LocalTime = string; // HH:mm、00:00〜23:59
export type MatchStatus = 'scheduled' | 'time_tbd' | 'venue_tbd' | 'postponed' | 'cancelled' | 'date_tbd' | 'completed';
export interface Region { id: string; name: string; aliases: string[]; }
export interface Station { id: string; name: string; kana: string; regionId: string; aliases: string[]; sortOrder: number; }
export interface Stadium { id: string; name: string; regionId: string; aliases: string[]; accessSourceId: string; accessUrl: string; }
export interface AccessLink {
  stadiumId: string; stationId: string; demoWalkMinutes?: number;
  basis: 'demo_assumption' | 'official_access';
  walkMinutes?: number | null; accessMode?: 'walk' | 'bus'; accessNote?: string;
  sourceId?: string; checkedOn?: DateKey;
}
export interface Team { id: string; name: string; defaultStadiumId: string; isDemo: boolean; }
export interface Change {
  field: 'matchDate' | 'stadiumId' | 'kickoffLocalTime';
  fromValue: string | null; toValue: string | null;
  changedAt: string; // ISO 8601、オフセット必須
  note: string;
}
export interface Match {
  id: string; competitionName: string; homeTeamId: string; awayTeamId: string;
  matchDate: DateKey; kickoffLocalTime: LocalTime | null; stadiumId: string | null;
  status: MatchStatus; history: Change[]; isDemo: boolean; sourceId: string | null; note: string;
  round?: number; checkedAt?: string;
  // date_tbd uses the source's anchor in matchDate; never present it as a confirmed date.
  candidateDates?: DateKey[];
  conditionalDates?: DateKey[];
}
export interface Coverage { stadiumId: string; startDate: DateKey; endDate: DateKey; state: 'demo_complete' | 'official_snapshot'; }
export interface Source { id: string; title: string; url: string; checkedOn: DateKey; purpose: 'venue_station_reference' | 'match_schedule'; }
export interface DemoRules {
  version: string; arrivalStartBeforeMinutes: number; arrivalEndBeforeMinutes: number;
  matchEndEarliestAfterMinutes: number; matchEndLatestAfterMinutes: number;
  // J1 only. Omission preserves the previous departure start for older datasets.
  earlyDepartureAfterMinutes?: number;
  departureTailMinutes: number; validatedForRealUse: false;
}
export interface DemoDataset {
  meta: {
    schemaVersion: 1 | 2; mode: 'demo' | 'j1'; createdOn: DateKey; timeZone: 'Asia/Tokyo';
    referenceDate: DateKey; rangeStart: DateKey; rangeEnd: DateKey; notice: string;
    season?: string; updatedAt?: string; scheduleUrl?: string; freshnessDays?: number;
  };
  regions: Region[]; stations: Station[]; stadiums: Stadium[]; accessLinks: AccessLink[];
  teams: Team[]; matches: Match[]; coverage: Coverage[]; sources: Source[]; rules: DemoRules;
}
export type Place = { type: 'all' } | { type: 'station' | 'stadium' | 'region'; id: string };
export interface SearchState { date: DateKey; month: string; place: Place; view: 'list' | 'calendar'; }
export interface TimeWindow { start: string; end: string; kind: 'arrival' | 'departure'; matchIds: string[]; ruleVersion: string; }
export interface FavoriteStore { schemaVersion: 1; stationIds: string[]; }
