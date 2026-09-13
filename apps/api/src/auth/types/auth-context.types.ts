export interface AuthContext {
  userId: string;
  organizationId: string;
  sessionId: string;
  /** Populated per-request by PermissionsGuard; never embedded in JWT. */
  permissions?: string[];
}
