import type { DemoDataset, Match } from './types';
import { dayStart, todayJst, toJst } from './dates';

export const isDemo = (data: DemoDataset) => data.meta.mode === 'demo';
export const checkedDate = (data: DemoDataset) => data.meta.updatedAt ? toJst(Date.parse(data.meta.updatedAt)).slice(0, 10) : data.meta.createdOn;
export const isStale = (data: DemoDataset, today = todayJst()) => !isDemo(data) && dayStart(today) - dayStart(checkedDate(data)) >= (data.meta.freshnessDays ?? 7) * 86_400_000;
export const coverageText = (data: DemoDataset) => `${data.meta.rangeStart}〜${data.meta.rangeEnd}`;
export const matchDateText = (match: Match) => match.status === 'date_tbd' ? `開催日未定（候補：${match.candidateDates!.join('・')}）` : match.matchDate;
export const emptyText = (data: DemoDataset) => isDemo(data) ? '対象のサンプル試合はありません' : isStale(data) ? '更新確認が必要です。収録データには該当するJ1の試合がありません' : '収録データに該当するJ1の試合はありません';
