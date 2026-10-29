import { useState } from 'react';
import { Dialog } from './Dialog';
import { Icon } from './Icon';

export function ShareButton() {
  const [message, setMessage] = useState('');
  const [url, setUrl] = useState('');
  return <div className="share-control"><button onClick={async () => {
    const value = location.href;
    try { await navigator.clipboard.writeText(value); setMessage('URLをコピーしました。'); }
    catch { setUrl(value); setMessage('URLを選択してコピーしてください。'); }
  }}><Icon name="link" />URLをコピー</button><span className="small muted" role="status">{message}</span>{['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) && <span className="small muted">このローカルURLは他の端末からは開けません。</span>}
    {url && <Dialog title="URLをコピー" onClose={() => setUrl('')}><p>コピーできなかったため、下のURLを選択してコピーしてください。</p><label htmlFor="share-url">共有するURL</label><textarea id="share-url" autoFocus readOnly value={url} onFocus={e => e.target.select()} /><div className="dialog-actions"><button onClick={() => setUrl('')}>閉じる</button></div></Dialog>}
  </div>;
}
