import { test as base, type BrowserContext } from '@playwright/test';
import { referenceData } from '../fixtures/j1-reference';

export { chromium, expect } from '@playwright/test';
export async function useReferenceData(context: BrowserContext) {
  await context.route('**/data/j1.json*', route => route.fulfill({ contentType: 'text/javascript', body: `export default ${JSON.stringify(referenceData)}` }));
}
export const test = base.extend({
  context: async ({ context }, use) => { await useReferenceData(context); await use(context); },
});
