import { MicroCMSSchemaType } from './index';

export interface MicroCMSApiSummary {
  name: string;
  endpoint: string;
  type: 'list' | 'object';
}

export interface MicroCMSApiDetail extends MicroCMSSchemaType {
  name: string;
  endpoint: string;
  type: 'list' | 'object';
}

export interface FetchManagementApiOptions {
  serviceDomain: string;
  apiKey: string;
  /** Maximum number of simultaneous detail requests (default: 5) */
  concurrency?: number;
  /** Per-request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Retries for network errors, 429 and 5xx responses (default: 3) */
  retries?: number;
  /** Base delay for exponential backoff in milliseconds (default: 500) */
  retryDelay?: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableStatus = (status: number) => status === 429 || status >= 500;

const getRetryDelay = (res: Response | undefined, attempt: number, base: number): number => {
  const retryAfter = Number(res?.headers?.get?.('retry-after'));
  if (Number.isFinite(retryAfter) && retryAfter > 0) return Math.min(retryAfter * 1000, 30000);
  return base * 2 ** attempt;
};

const fetchJson = async <T>(
  url: string,
  options: Required<
    Pick<FetchManagementApiOptions, 'apiKey' | 'timeout' | 'retries' | 'retryDelay'>
  >,
  description: string
): Promise<T> => {
  const { apiKey, timeout, retries, retryDelay } = options;
  for (let attempt = 0; ; attempt++) {
    let res: Response | undefined;
    let error: unknown;
    try {
      res = await fetch(url, {
        headers: { 'X-MICROCMS-API-KEY': apiKey },
        signal: AbortSignal.timeout(timeout),
      });
      if (res.ok) return (await res.json()) as T;
    } catch (e) {
      error = e;
    }

    const retryable = res ? isRetryableStatus(res.status) : true;
    if (!retryable || attempt >= retries) {
      const reason = res
        ? `${res.status} ${res.statusText}`
        : error instanceof Error
          ? error.message
          : String(error);
      throw new Error(`Failed to fetch ${description}: ${reason}`, { cause: error });
    }
    await sleep(getRetryDelay(res, attempt, retryDelay));
  }
};

/**
 * Fetches schema definitions from microCMS Management API.
 */
export const fetchSchemas = async (
  options: FetchManagementApiOptions
): Promise<MicroCMSApiDetail[]> => {
  const {
    serviceDomain,
    apiKey,
    concurrency = 5,
    timeout = 30000,
    retries = 3,
    retryDelay = 500,
  } = options;
  const request = { apiKey, timeout, retries, retryDelay };
  const baseUrl = `https://${serviceDomain}.microcms-management.io/api/v1/apis`;

  const data = await fetchJson<{ apis: MicroCMSApiSummary[] }>(
    baseUrl,
    request,
    'APIs from microCMS Management API'
  );

  // Fetch details with bounded concurrency, preserving the original order.
  const results: MicroCMSApiDetail[] = new Array(data.apis.length);
  let next = 0;
  const worker = async () => {
    while (next < data.apis.length) {
      const index = next++;
      const { endpoint } = data.apis[index];
      results[index] = await fetchJson<MicroCMSApiDetail>(
        `${baseUrl}/${endpoint}`,
        request,
        `API schema for endpoint '${endpoint}'`
      );
    }
  };
  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(concurrency, data.apis.length)) }, worker)
  );

  return results;
};
