import { describe, it, expect, afterEach, vi } from 'vitest';
import { fetchSchemas } from '../src/remote';

const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});

const json = (body: unknown): Response =>
  ({ ok: true, status: 200, statusText: 'OK', json: async () => body }) as unknown as Response;
const fail = (status: number, statusText: string): Response =>
  ({ ok: false, status, statusText, headers: new Headers() }) as unknown as Response;

const opts = { serviceDomain: 'd', apiKey: 'k', retryDelay: 1 };
const detail = (endpoint: string) => ({
  name: endpoint,
  endpoint,
  type: 'list',
  apiFields: [],
  customFields: [],
});

describe('fetchSchemas', () => {
  it('keeps the original order and respects the concurrency limit', async () => {
    const endpoints = ['a', 'b', 'c', 'd', 'e', 'f'];
    let active = 0;
    let maxActive = 0;
    global.fetch = (async (url: string | URL | Request) => {
      const u = url.toString();
      if (u.endsWith('/apis')) return json({ apis: endpoints.map((endpoint) => ({ endpoint })) });
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      return json(detail(u.split('/').pop()!));
    }) as typeof fetch;

    const result = await fetchSchemas({ ...opts, concurrency: 2 });
    expect(result.map((r) => r.endpoint)).toEqual(endpoints);
    expect(maxActive).toBeLessThanOrEqual(2);
  });

  it('retries on 429/5xx and then succeeds', async () => {
    let calls = 0;
    global.fetch = (async () => {
      calls++;
      return calls < 3 ? fail(calls === 1 ? 429 : 503, 'busy') : json({ apis: [] });
    }) as typeof fetch;

    await expect(fetchSchemas(opts)).resolves.toEqual([]);
    expect(calls).toBe(3);
  });

  it('does not retry on 4xx and reports the endpoint', async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) =>
      url.toString().endsWith('/apis') ? json({ apis: [{ endpoint: 'x' }] }) : fail(404, 'Not Found')
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(fetchSchemas(opts)).rejects.toThrow(/endpoint 'x': 404 Not Found/);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('gives up after the retry limit on network errors', async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error('ECONNRESET');
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(fetchSchemas({ ...opts, retries: 2 })).rejects.toThrow(/ECONNRESET/);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
