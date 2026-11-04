import { apiClient } from './client';

export interface SuggestOrganizationCodeResponse {
  code: string;
  available: boolean;
}

export interface SubmitRegistrationRequest {
  organizationName: string;
  preferredOrganizationCode?: string;
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
  suggestOrganizationCode: async (
    name: string,
    code?: string,
  ): Promise<SuggestOrganizationCodeResponse> => {
    const params = new URLSearchParams({ name });
    if (code?.trim()) {
      params.set('code', code.trim());
    }
    return apiClient.get<SuggestOrganizationCodeResponse>(
      `/public/organizations/suggest-code?${params.toString()}`,
      { auth: false },
    );
  },

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
