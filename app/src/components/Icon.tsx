type IconName = 'search' | 'calendar' | 'star' | 'arrow' | 'train' | 'chevron' | 'info' | 'link' | 'clock' | 'sun' | 'moon' | 'help';
const paths: Record<IconName, string> = {
  clock: 'M22 12a10 10 0 1 0-20 0 10 10 0 0 0 20 0M12 6v6l4 2',
  sun: 'M16 12a4 4 0 1 0-8 0 4 4 0 0 0 8 0M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1',
  moon: 'M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z',
  help: 'M9 8a3 3 0 1 1 5 3c-2 1-2 2-2 3m0 3h.01M22 12a10 10 0 1 0-20 0 10 10 0 0 0 20 0',
  search: 'M21 21l-5-5M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15',
  calendar: 'M5 5h14a2 2 0 0 1 2 2v13H3V7a2 2 0 0 1 2-2M7 3v4m10-4v4M3 10h18M7 14h2m3 0h2m3 0h1M7 17h2m3 0h2',
  star: 'm12 3 2.8 5.8 6.4.9-4.6 4.5 1.1 6.3-5.7-3-5.7 3 1.1-6.3-4.6-4.5 6.4-.9Z',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  train: 'M6 3h12a2 2 0 0 1 2 2v11a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V5a2 2 0 0 1 2-2ZM4 11h16M8 15h.01M16 15h.01M8 19l-3 3m11-3 3 3M9 6h6',
  chevron: 'm9 5 7 7-7 7',
  info: 'M12 8h.01M12 11v6M22 12a10 10 0 1 0-20 0 10 10 0 0 0 20 0',
  link: 'm10 13 4-4M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 1 1-1a4 4 0 1 1 6 6l-4 4a4 4 0 0 1-6 0',
};
export function Icon({ name, filled = false }: { name: IconName; filled?: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
