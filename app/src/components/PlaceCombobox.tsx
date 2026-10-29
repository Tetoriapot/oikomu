import { useId, useState } from 'react';
import { useApp } from '../app/context';
import type { Place } from '../domain/types';
import { placeCandidates } from '../domain/search';
import { Icon } from './Icon';

export function PlaceCombobox({ value, onInput, onSelect }: { value: string; onInput: (value: string) => void; onSelect: (place: Place, name: string) => void }) {
  const { data } = useApp();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const candidates = placeCandidates(data, value);
  const select = (index: number) => {
    const candidate = candidates[index];
    if (candidate) { onSelect(candidate.place, candidate.name); setOpen(false); setActive(-1); }
  };
  return <div className="place-input" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
    <label htmlFor={id}>駅・地域・スタジアム</label>
    <div className="input-with-icon"><Icon name="search" /><input id={id} role="combobox" autoComplete="off" aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-list`} aria-activedescendant={open && active >= 0 ? `${id}-${active}` : undefined} placeholder="駅名・地域・会場名を入力" value={value}
      onChange={e => { onInput(e.target.value); setOpen(true); setActive(-1); }} onFocus={() => setOpen(true)}
      onKeyDown={e => {
        if (e.key === 'Escape') { e.preventDefault(); setOpen(false); setActive(-1); }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault(); setOpen(true);
          setActive(i => candidates.length ? (i + (e.key === 'ArrowDown' ? 1 : -1) + candidates.length) % candidates.length : -1);
        }
        if (e.key === 'Enter' && open && active >= 0) { e.preventDefault(); select(active); }
      }} />{value && <button type="button" className="clear-input" aria-label="場所の入力を消す" onClick={() => { onInput(''); setOpen(false); }}>×</button>}</div>
    {open && <div className="suggestion-panel"><ul id={`${id}-list`} role="listbox" aria-label="場所の候補">{candidates.map((candidate, i) => <li id={`${id}-${i}`} role="option" aria-selected={active === i} className={active === i ? 'active' : ''} key={candidate.name} onPointerDown={e => e.preventDefault()} onClick={() => select(i)}><span className="tag">{candidate.kind}</span>{candidate.name}</li>)}</ul>{!candidates.length && <p role="status">対象の駅・地域が見つかりません。{data.meta.mode === 'demo' ? '東京都・神奈川県・埼玉県・千葉県の5会場・7駅を収録しています。' : `J1の${data.stadiums.length}会場・${data.stations.length}駅を収録しています。`}</p>}</div>}
  </div>;
}
