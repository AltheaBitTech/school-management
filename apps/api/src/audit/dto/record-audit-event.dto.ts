import { Prisma } from '@prisma/client';

export interface RecordAuditEventInput {
  organizationId: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  requestId?: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
}
