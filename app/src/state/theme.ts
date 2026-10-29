import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';
export const THEME_KEY = 'oikomu:theme:v1';
export function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* Storage can be unavailable; the current tab still supports switching. */ }
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [message, setMessage] = useState('');
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === THEME_KEY && (event.newValue === 'light' || event.newValue === 'dark')) setTheme(event.newValue);
    };
    addEventListener('storage', sync);
    return () => removeEventListener('storage', sync);
  }, []);
  function chooseTheme(value: Theme) {
    setTheme(value);
    try { localStorage.setItem(THEME_KEY, value); setMessage(''); }
    catch { setMessage('表示モードを保存できません。このタブを開いている間だけ切り替えます。'); }
  }
  return { theme, chooseTheme, message };
}
