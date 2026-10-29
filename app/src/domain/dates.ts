const DAY = 86_400_000;
const JST = 9 * 3_600_000;
export const REFERENCE_DATE = '2026-11-07';

export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '0001-01-01') return false;
  const timestamp = Date.parse(`${value}T00:00:00+09:00`);
  return Number.isFinite(timestamp) && toJst(timestamp).slice(0, 10) === value;
}
export const validTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
export const dayStart = (date: string) => Date.parse(`${date}T00:00:00+09:00`);
// Shift to JST before using UTC formatting, independently of the device timezone.
export const toJst = (timestamp: number) => new Date(timestamp + JST).toISOString().slice(0, 19) + '+09:00';
export const todayJst = () => toJst(Date.now()).slice(0, 10);
export const addDays = (date: string, days: number) => toJst(dayStart(date) + days * DAY).slice(0, 10);
export function moveMonth(date: string, delta: number): string {
  const d = new Date(`${date.slice(0, 7)}-01T12:00:00+09:00`);
  d.setUTCMonth(d.getUTCMonth() + delta, 1);
  return toJst(d.getTime()).slice(0, 7) + '-01';
}
export const dateLabel = (date: string) => new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo', year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
}).format(new Date(dayStart(date)));
export function calendarDays(date: string): string[] {
  const first = date.slice(0, 7) + '-01';
  const weekday = new Date(dayStart(first) + JST).getUTCDay();
  const start = addDays(first, -((weekday + 6) % 7));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}
export function timeLabel(timestamp: string, date?: string): string {
  const normalized = toJst(Date.parse(timestamp));
  if (date && normalized === `${addDays(date, 1)}T00:00:00+09:00`) return '24:00';
  return normalized.slice(11, 16);
}
