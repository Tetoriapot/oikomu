import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export const FAVORITES_KEY = 'oikomu:demo:v1:favorites';
export const J1_FAVORITES_KEY = 'oikomu:j1:v1:favorites';
export const MEMORY_NOTICE = 'この環境では保存できないため、開いている間だけ保持します。';
export function parseFavorites(value: string | null, knownIds: string[]): { ids: string[]; corrupt: boolean } {
  if (value === null) return { ids: [], corrupt: false };
  try {
    const input: unknown = JSON.parse(value);
    if (!input || typeof input !== 'object' || !('schemaVersion' in input) || input.schemaVersion !== 1 || !('stationIds' in input) || !Array.isArray(input.stationIds)) return { ids: [], corrupt: true };
    return { ids: [...new Set(input.stationIds.filter((id): id is string => typeof id === 'string' && knownIds.includes(id)))], corrupt: false };
  } catch { return { ids: [], corrupt: true }; }
}
export function loadFavorites(storage: Pick<Storage, 'getItem'>, knownIds: string[], key = FAVORITES_KEY) {
  try {
    const saved = storage.getItem(key);
    const parsed = parseFavorites(saved ?? (key === J1_FAVORITES_KEY ? storage.getItem(FAVORITES_KEY) : null), knownIds);
    return { ids: parsed.ids, message: parsed.corrupt ? '保存されたお気に入りを読み込めなかったため、空の状態で開始しました。' : '' };
  } catch { return { ids: [], message: MEMORY_NOTICE }; }
}
export function saveFavorites(storage: Pick<Storage, 'setItem' | 'removeItem'>, ids: string[], clear = false, key = FAVORITES_KEY): boolean {
  try {
    // Keep an explicit empty J1 value so a reset cannot resurrect demo favorites.
    if (clear && key === FAVORITES_KEY) storage.removeItem(key);
    else storage.setItem(key, JSON.stringify({ schemaVersion: 1, stationIds: ids }));
    return true;
  } catch { return false; }
}
interface FavoritesState { ids: string[]; message: string; toggle: (id: string) => void; clear: () => void }
const FavoritesContext = createContext<FavoritesState | null>(null);
export function FavoritesProvider({ knownIds, children, storageKey = FAVORITES_KEY }: { knownIds: string[]; children: ReactNode; storageKey?: string }) {
  const [state, setState] = useState(() => {
    try { return loadFavorites(localStorage, knownIds, storageKey); } catch { return { ids: [], message: MEMORY_NOTICE }; }
  });
  const persist = (ids: string[], clear = false) => {
    let saved = false;
    try { saved = saveFavorites(localStorage, ids, clear, storageKey); } catch { /* Access to localStorage itself can be denied. */ }
    setState(previous => ({ ids, message: saved ? previous.message : MEMORY_NOTICE }));
  };
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== storageKey) return;
      const result = parseFavorites(event.newValue, knownIds);
      setState(previous => ({ ...previous, ids: result.ids }));
    };
    addEventListener('storage', sync);
    return () => removeEventListener('storage', sync);
  }, [knownIds, storageKey]);
  return <FavoritesContext value={{ ...state, toggle: id => {
    if (!knownIds.includes(id)) return;
    persist(state.ids.includes(id) ? state.ids.filter(x => x !== id) : [...state.ids, id]);
  }, clear: () => persist([], true) }}>{children}</FavoritesContext>;
}
export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error('FavoritesContext is missing');
  return context;
}
