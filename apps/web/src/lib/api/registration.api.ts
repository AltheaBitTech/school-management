import { apiClient } from './client';

export interface SubmitRegistrationRequest {
  organizationName: string;
  contactEmail: string;
  contactFirstName: string;
  contactLastName: string;
  contactPhone: string;
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

export interface RegistrationSignupContext {
  registrationRequestId: string;
  organizationName: string;
  contactEmail: string;
  organizationCode: string;
  signupCompleted: boolean;
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

  getSignupContext: async (registrationRequestId: string): Promise<RegistrationSignupContext> => {
    return apiClient.get<RegistrationSignupContext>(
      `/public/organizations/register/${registrationRequestId}/signup-context`,
      { auth: false },
    );
  },
};
