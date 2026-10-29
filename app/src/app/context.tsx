import { createContext, useContext } from 'react';
import type { DemoDataset } from '../domain/types';
import type { Route } from './router';

export const AppContext = createContext<{ data: DemoDataset; route: Route } | null>(null);
export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('AppContext is missing');
  return value;
}
