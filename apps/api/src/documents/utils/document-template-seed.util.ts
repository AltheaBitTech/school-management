import { DocumentType, Prisma } from '@prisma/client';
import { BONAFIDE_TEMPLATE_DEFINITION } from '../constants/document.constants';

type PrismaClientLike = Prisma.TransactionClient | {
  documentTemplate: Prisma.TransactionClient['documentTemplate'];
};

export async function ensureDefaultDocumentTemplates(
  client: PrismaClientLike,
  organizationId: string,
  createdById?: string,
): Promise<void> {
  await client.documentTemplate.upsert({
    where: {
      organizationId_documentType: {
        organizationId,
        documentType: DocumentType.BONAFIDE_CERTIFICATE,
      },
    },
    update: {
      name: BONAFIDE_TEMPLATE_DEFINITION.name,
      content: BONAFIDE_TEMPLATE_DEFINITION.content,
      version: BONAFIDE_TEMPLATE_DEFINITION.version,
      active: true,
    },
    create: {
      organizationId,
      name: BONAFIDE_TEMPLATE_DEFINITION.name,
      documentType: DocumentType.BONAFIDE_CERTIFICATE,
      content: BONAFIDE_TEMPLATE_DEFINITION.content,
      version: BONAFIDE_TEMPLATE_DEFINITION.version,
      active: true,
      createdById: createdById ?? null,
    },
  });
}
