import { apiClient } from './client';

export interface SubmitRegistrationRequest {
  organizationName: string;
  contactEmail: string;
  contactFirstName: string;
  contactLastName: string;
  contactPhone?: string;
  address?: string;
  city?: string;
  state?: string;
}

export interface SubmitRegistrationResponse {
  id: string;
  status: string;
  createdAt: string;
  message: string;
}

export const registrationApi = {
  submitRegistrationRequest: async (
    data: SubmitRegistrationRequest,
  ): Promise<SubmitRegistrationResponse> => {
    const response = await apiClient.post<SubmitRegistrationResponse>(
      '/public/organizations/register',
      data,
      { auth: false },
    );
    return response;
  },
};
