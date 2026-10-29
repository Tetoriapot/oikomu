import { useApp } from '../app/context';
import { routeUrl } from '../app/router';
export function NotFoundPage() {
  const { route } = useApp();
  return <div className="empty-state"><p className="eyebrow">404</p><h1 tabIndex={-1}>ページが見つかりません</h1><p>URLが正しいか確認するか、検索画面から探してください。</p><a className="button primary" href={routeUrl('/search', route)}>検索へ戻る</a></div>;
}
