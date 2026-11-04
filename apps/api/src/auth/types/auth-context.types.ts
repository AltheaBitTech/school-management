export interface AuthContext {
  userId: string;
  organizationId: string;
  sessionId: string;
  /** Server-checked role for this session. Never taken from the request body. */
  activeRoleId?: string;
  activeRoleCode?: string;
  /** Populated per-request by PermissionsGuard; never embedded in JWT. */
  permissions?: string[];
}
