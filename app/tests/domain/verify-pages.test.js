import { expect, it, vi } from 'vitest';
import { verifyPublishedPages } from '../../scripts/verify-pages.mjs';
import { digest } from '../../scripts/collection-store.mjs';

const html = '<html><script src="./assets/current.js"></script></html>';
const options = { url: 'https://example.com/oikomu/', expectedSha: digest(html), wait: vi.fn() };

it('accepts exactly the validated build', async () => {
  const fetchPage = vi.fn(async () => new Response(html));
  await verifyPublishedPages({ ...options, fetchPage });
  expect(fetchPage).toHaveBeenCalledTimes(1);
  const [url, request] = fetchPage.mock.calls[0];
  expect(url.pathname).toBe('/oikomu/');
  expect(url.searchParams.get('verify')).toContain(options.expectedSha);
  expect(request.headers['Cache-Control']).toBe('no-cache');
});

it('waits for old content to be replaced', async () => {
  const wait = vi.fn();
  const fetchPage = vi.fn().mockResolvedValueOnce(new Response('old build')).mockResolvedValueOnce(new Response(html));
  await verifyPublishedPages({ ...options, fetchPage, wait });
  expect(fetchPage).toHaveBeenCalledTimes(2);
  expect(wait).toHaveBeenCalledExactlyOnceWith(10_000);
});

it('retries HTTP and network failures before checking content', async () => {
  const fetchPage = vi.fn().mockResolvedValueOnce(new Response('', { status: 503 }))
    .mockRejectedValueOnce(new Error('Timed out')).mockResolvedValueOnce(new Response(html));
  await verifyPublishedPages({ ...options, fetchPage });
  expect(fetchPage).toHaveBeenCalledTimes(3);
});

it('fails after bounded retries when old content remains', async () => {
  const fetchPage = vi.fn(async () => new Response('old build'));
  const wait = vi.fn();
  await expect(verifyPublishedPages({ ...options, fetchPage, wait })).rejects.toThrow('does not match build');
  expect(fetchPage).toHaveBeenCalledTimes(12);
  expect(wait).toHaveBeenCalledTimes(11);
});

it.each([{ url: 'file:///private' }, { expectedSha: 'invalid' }])('rejects invalid verification input before fetching %j', async overrides => {
  const fetchPage = vi.fn();
  await expect(verifyPublishedPages({ ...options, ...overrides, fetchPage })).rejects.toThrow('HTTPS URL');
  expect(fetchPage).not.toHaveBeenCalled();
});
