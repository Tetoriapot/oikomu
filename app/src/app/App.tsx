import { useEffect, useState } from 'react';
import { DemoBanner } from '../components/DemoBanner';
import type { DemoDataset } from '../domain/types';
import { AppContext } from './context';
import { routeUrl, useRouter } from './router';
import { SearchPage } from '../pages/SearchPage';
import { Icon } from '../components/Icon';
import { FavoritesProvider, useFavorites, FAVORITES_KEY, J1_FAVORITES_KEY } from '../state/favorites';
import { StationPage } from '../pages/StationPage';
import { MatchPage } from '../pages/MatchPage';
import { FavoritesPage } from '../pages/FavoritesPage';
import { AboutPage } from '../pages/AboutPage';
import { SourcesPage } from '../pages/SourcesPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { HelpPage } from '../pages/HelpPage';
import { UpdatesPage } from '../pages/UpdatesPage';
import { HeaderTools } from '../components/HeaderTools';
import { useTheme } from '../state/theme';

function StorageNotice() {
  const { message } = useFavorites();
  return message ? <p className="info-note" role="status">{message}</p> : null;
}

function LoadedApp({ data, theme }: { data: DemoDataset; theme: ReturnType<typeof useTheme> }) {
  const route = useRouter(data);
  useEffect(() => { document.querySelector<HTMLHeadingElement>('h1')?.focus(); }, [route.path]);
  const station = /^\/stations\/([^/]+)$/.exec(route.path);
  const match = /^\/matches\/([^/]+)$/.exec(route.path);
  const page = route.path === '/search' ? <SearchPage /> : station ? <StationPage id={station[1]} /> : match ? <MatchPage id={match[1]} /> : route.path === '/favorites' ? <FavoritesPage /> : route.path === '/about' ? <AboutPage /> : route.path === '/sources' ? <SourcesPage /> : route.path === '/help' ? <HelpPage /> : route.path === '/updates' ? <UpdatesPage /> : <NotFoundPage />;
  const links = [
    { name: '探す', path: '/search', view: 'list' as const, icon: 'search' as const },
    { name: 'カレンダー', path: '/search', view: 'calendar' as const, icon: 'calendar' as const },
    { name: 'お気に入り', path: '/favorites', view: route.view, icon: 'star' as const },
  ];
  const navLinks = links.map(item => <a key={item.name} href={routeUrl(item.path, { ...route, view: item.view })} aria-current={route.path === item.path && (item.path !== '/search' || route.view === item.view) ? 'page' : undefined}><Icon name={item.icon} />{item.name}</a>);
  return <AppContext value={{ data, route }}><FavoritesProvider knownIds={data.stations.map(s => s.id)} storageKey={data.meta.mode === 'demo' ? FAVORITES_KEY : J1_FAVORITES_KEY}><a className="skip-link" href="#main" onClick={e => { e.preventDefault(); document.getElementById('main')?.focus(); }}>本文へ移動</a><DemoBanner data={data} /><header className="site-header"><div className="header-inner"><a className="brand" href={routeUrl('/search', route)}><span className="brand-mark"><Icon name="train" /></span>オイコム<span className="brand-en">OIKOMU</span></a><HeaderTools theme={theme.theme} chooseTheme={theme.chooseTheme} /><nav aria-label="メインナビゲーション">{navLinks}<a href={routeUrl('/sources', route)} aria-current={route.path === '/sources' ? 'page' : undefined}>検証・参照リンク</a><a href={routeUrl('/about', route)} aria-current={route.path === '/about' ? 'page' : undefined}>使い方</a></nav></div></header><main id="main" tabIndex={-1} className="container">{route.notice && <p className="info-note" role="status">{route.notice}</p>}<StorageNotice />{theme.message && <p className="info-note" role="status">{theme.message}</p>}{page}</main><footer className="site-footer">オイコム · {data.meta.mode === 'demo' ? 'デモ版' : 'J1日程'}<span>{data.meta.mode === 'demo' ? '試合・時間帯はサンプル' : '時間帯は未検証の参考計算'} / 日本時間（JST）</span><a href={routeUrl('/sources', route)}>検証・参照リンク</a></footer><nav className="bottom-nav" aria-label="下部ナビゲーション">{navLinks}</nav></FavoritesProvider></AppContext>;
}
export function App() {
  const theme = useTheme();
  const [state, setState] = useState<{ data?: DemoDataset; error?: boolean }>({});
  useEffect(() => { let active = true; import('../data/repository').then(({ getDataset }) => getDataset(new URLSearchParams(location.search).get('data') === 'demo' ? 'demo' : 'j1')).then(data => { if (active) setState({ data }); }).catch(() => { if (active) setState({ error: true }); }); return () => { active = false; }; }, []);
  if (state.data) return <LoadedApp data={state.data} theme={theme} />;
  return <><DemoBanner /><main className="container" aria-busy={!state.error}>{state.error ? <><h1>データを読み込めませんでした</h1><p>データファイルを確認して再読み込みしてください。</p><button onClick={() => location.reload()}>再読み込み</button></> : <><h1>オイコム</h1><p role="status">データを読み込んでいます…</p><div className="skeleton" /></>}</main></>;
}

