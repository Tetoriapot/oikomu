import { useState } from 'react';
import { useApp } from '../app/context';
import { routeUrl } from '../app/router';
import { validDate } from '../domain/dates';

export function DateControl() {
  const { route } = useApp();
  const [date, setDate] = useState(route.date);
  const [error, setError] = useState('');
  return <form className="date-control" noValidate onSubmit={e => { e.preventDefault(); if (!validDate(date)) { setError('実在する日付を入力してください。'); return; } setError(''); location.hash = routeUrl(route.path, { ...route, date }); }}><div><label htmlFor="detail-date">確認する日付</label><input id="detail-date" type="date" value={date} onChange={e => setDate(e.target.value)} /></div><button className="primary" type="submit">日付を変更</button>{error && <p role="alert" className="form-error">{error}</p>}</form>;
}
