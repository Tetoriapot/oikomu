import { useEffect, useState } from 'react';
import type { DemoDataset, Place, SearchState } from '../domain/types';
import { REFERENCE_DATE, todayJst, validDate } from '../domain/dates';
import { placeKey } from '../domain/search';

export interface Route extends SearchState { path: string; notice: string }
export function routeUrl(path: string, state: SearchState): string {
  const params = new URLSearchParams({ date: state.date, place: placeKey(state.place), view: state.view });
  if (state.view === 'calendar') params.set('month', state.date.slice(0, 7));
  return `#${path}?${params}`;
}
export function parseRoute(hash: string, data: DemoDataset): Route {
  const [rawPath, query = ''] = hash.replace(/^#/, '').split('?');
  const params = new URLSearchParams(query);
  const rawDate = params.get('date');
  const date = rawDate && validDate(rawDate) ? rawDate : data.meta.mode === 'demo' ? REFERENCE_DATE : todayJst();
  let place: Place = { type: 'all' };
  const rawPlace = params.get('place') ?? 'all';
  const [type, id, extra] = rawPlace.split(':');
  if (!extra && id) {
    if (type === 'station' && data.stations.some(s => s.id === id)) place = { type, id };
    if (type === 'stadium' && data.stadiums.some(s => s.id === id)) place = { type, id };
    if (type === 'region' && data.regions.some(s => s.id === id)) place = { type, id };
  }
  return { path: rawPath || '/search', date, month: date.slice(0, 7), place, view: params.get('view') === 'calendar' ? 'calendar' : 'list', notice: rawDate !== null && !validDate(rawDate) ? (data.meta.mode === 'demo' ? '日付をデモ基準日に戻しました。' : '日付を今日に戻しました。') : rawPlace !== placeKey(place) ? '場所をすべての対象地域に戻しました。' : '' };
}
export function useRouter(data: DemoDataset) {
  const [route, setRoute] = useState(() => parseRoute(location.hash, data));
  useEffect(() => {
    const read = () => {
      const next = parseRoute(location.hash, data);
      const canonical = routeUrl(next.path, next);
      if (location.hash !== canonical) history.replaceState(null, '', canonical);
      setRoute(next);
    };
    read();
    addEventListener('hashchange', read);
    return () => removeEventListener('hashchange', read);
  }, [data]);
  return route;
}
