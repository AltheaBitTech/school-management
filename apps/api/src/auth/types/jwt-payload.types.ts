export interface AccessTokenPayload {
  sub: string;
  organizationId: string;
  sessionId?: string;
  activeRoleId?: string;
  purpose?: 'access' | 'context-selection';
}
