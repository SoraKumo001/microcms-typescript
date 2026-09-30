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
}

/**
 * Fetches schema definitions from microCMS Management API.
 */
export const fetchSchemas = async (
  options: FetchManagementApiOptions
): Promise<MicroCMSApiDetail[]> => {
  const { serviceDomain, apiKey } = options;
  const baseUrl = `https://${serviceDomain}.microcms-management.io/api/v1/apis`;

  const res = await fetch(baseUrl, {
    headers: {
      'X-MICROCMS-API-KEY': apiKey,
    },
  });

  if (!res.ok) {
    throw new Error(
      `Failed to fetch APIs from microCMS Management API: ${res.status} ${res.statusText}`
    );
  }

  const data = (await res.json()) as { apis: MicroCMSApiSummary[] };
  const apiDetails: MicroCMSApiDetail[] = [];

  for (const api of data.apis) {
    const detailRes = await fetch(`${baseUrl}/${api.endpoint}`, {
      headers: {
        'X-MICROCMS-API-KEY': apiKey,
      },
    });
    if (!detailRes.ok) {
      throw new Error(
        `Failed to fetch API schema for endpoint '${api.endpoint}': ${detailRes.status} ${detailRes.statusText}`
      );
    }
    const detail = (await detailRes.json()) as MicroCMSApiDetail;
    apiDetails.push(detail);
  }

  return apiDetails;
};
