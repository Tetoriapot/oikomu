import demo from '../../../data/demo.json';
import j1 from '../../../data/j1.json';
import { validateDataset } from './validate';
export { safeAccessUrl, validateDataset } from './validate';

export const getDataset = (mode: 'demo' | 'j1' = 'j1') => validateDataset(mode === 'demo' ? demo : j1);
