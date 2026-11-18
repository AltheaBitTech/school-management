import { ApiError, apiRequest } from '@/lib/api/client';
import { getAccessToken } from '@/lib/auth/session';

export interface OrganizationSummary {
  id: string;
  name: string;
  code: string;
  status: string;
  timezone: string;
}

export interface OrganizationBootstrapResult {
  organization: OrganizationSummary;
  admin: {
    id: string;
    email: string;
    organizationId: string;
  };
}

export async function bootstrapOrganization(input: {
  name: string;
  code: string;
  institutionType?: 'SCHOOL' | 'COLLEGE' | 'INSTITUTE';
  admin: {
    email: string;
    password: string;
  };
}): Promise<OrganizationBootstrapResult> {
  const accessToken = getAccessToken();

  if (!accessToken) {
    throw new ApiError('Authentication is required to create an organization', 401);
  }

  const response = await apiRequest<{ data: OrganizationBootstrapResult }>('/organizations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: input,
  });

  return response.data;
}

export async function getCurrentOrganization(): Promise<OrganizationSummary> {
  const accessToken = getAccessToken();

  if (!accessToken) {
    throw new ApiError('Authentication is required', 401);
  }

  const response = await apiRequest<{ data: OrganizationSummary }>('/organizations/current', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response.data;
}

export async function callRbacTest(): Promise<{ userId: string; organizationId: string }> {
  const accessToken = getAccessToken();

  if (!accessToken) {
    throw new ApiError('Authentication is required', 401);
  }

  const response = await apiRequest<{ data: { userId: string; organizationId: string } }>(
    '/auth/rbac-test',
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  return response.data;
}
