import { DocumentType, Prisma } from '@prisma/client';
import { DOCUMENT_TEMPLATE_DEFINITIONS } from '../constants/document.constants';

type PrismaClientLike = Prisma.TransactionClient | {
  documentTemplate: Prisma.TransactionClient['documentTemplate'];
};

export async function ensureDefaultDocumentTemplates(
  client: PrismaClientLike,
  organizationId: string,
  createdById?: string,
): Promise<void> {
  for (const documentType of Object.values(DocumentType)) {
    const definition = DOCUMENT_TEMPLATE_DEFINITIONS[documentType];
    await client.documentTemplate.upsert({
      where: {
        organizationId_documentType: {
          organizationId,
          documentType,
        },
      },
      update: {
        name: definition.name,
        content: definition.content,
        version: definition.version,
        active: true,
      },
      create: {
        organizationId,
        name: definition.name,
        documentType,
        content: definition.content,
        version: definition.version,
        active: true,
        createdById: createdById ?? null,
      },
    });
  }
}
