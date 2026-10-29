import { useApp } from '../app/context';
import { routeUrl } from '../app/router';
import type { useTheme } from '../state/theme';
import { Icon } from './Icon';

export function HeaderTools({ theme, chooseTheme }: Pick<ReturnType<typeof useTheme>, 'theme' | 'chooseTheme'>) {
  const { route } = useApp();
  return <div className="header-tools" aria-label="表示設定とヘルプ">
    <a href={routeUrl('/updates', route)} aria-current={route.path === '/updates' ? 'page' : undefined}><Icon name="clock" />更新情報</a>
    <div className="theme-switch" role="group" aria-label="表示モード">
      <button type="button" aria-label="ライトモード" aria-pressed={theme === 'light'} onClick={() => chooseTheme('light')}><Icon name="sun" /><span>ライト</span></button>
      <button type="button" aria-label="ダークモード" aria-pressed={theme === 'dark'} onClick={() => chooseTheme('dark')}><Icon name="moon" /><span>ダーク</span></button>
    </div>
    <a href={routeUrl('/help', route)} aria-current={route.path === '/help' ? 'page' : undefined}><Icon name="help" />Help</a>
  </div>;
}
