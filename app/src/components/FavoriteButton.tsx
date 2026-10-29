import { useFavorites } from '../state/favorites';
import type { Station } from '../domain/types';
import { Icon } from './Icon';

export function FavoriteButton({ station }: { station: Station }) {
  const favorites = useFavorites();
  const selected = favorites.ids.includes(station.id);
  return <button className={`favorite-button ${selected ? 'selected' : ''}`} aria-pressed={selected} aria-label={`${station.name}駅をお気に入り${selected ? 'から解除' : 'に登録'}`} onClick={() => favorites.toggle(station.id)}><Icon name="star" filled={selected} /></button>;
}
