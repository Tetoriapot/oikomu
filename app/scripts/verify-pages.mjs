import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { digest } from './collection-store.mjs';

export async function verifyPublishedPages({ url, expectedSha, fetchPage = fetch, wait = delay }) {
  const target = new URL(url);
  if (target.protocol !== 'https:' || !/^[a-f0-9]{64}$/.test(expectedSha)) {
    throw new Error('A public HTTPS URL and a SHA-256 build digest are required.');
  }
  let reason = 'No response';
  // Poll propagation, but never accept the deployment API's status as proof of content.
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    target.searchParams.set('verify', `${expectedSha}-${Date.now()}-${attempt}`);
    try {
      const response = await fetchPage(target, {
        headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(10_000),
      });
      if (response.ok) {
        const actual = digest(Buffer.from(await response.arrayBuffer()));
        if (actual === expectedSha) return;
        reason = `Served HTML digest ${actual} does not match build ${expectedSha}`;
      } else {
        reason = `HTTP ${response.status}`;
      }
    } catch (error) {
      reason = error instanceof Error ? error.message : String(error);
    }
    if (attempt < 12) await wait(10_000);
  }
  throw new Error(`Published content verification failed: ${reason}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await verifyPublishedPages({ url: process.env.PAGE_URL, expectedSha: process.env.EXPECTED_HTML_SHA });
    console.log('Published HTML matches the validated build and its hashed data assets.');
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
