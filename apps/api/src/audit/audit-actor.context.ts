import { AsyncLocalStorage } from 'node:async_hooks';

export interface AuditActorContext {
  activeRoleId?: string;
  activeRoleCode?: string;
}

export const auditActorContext = new AsyncLocalStorage<AuditActorContext>();
