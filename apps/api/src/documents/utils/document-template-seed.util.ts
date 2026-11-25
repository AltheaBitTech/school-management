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
    const existing = await client.documentTemplate.findUnique({
      where: {
        organizationId_documentType: {
          organizationId,
          documentType,
        },
      },
      select: { id: true },
    });
    if (existing) {
      continue;
    }

    try {
      await client.documentTemplate.create({
        data: {
          organizationId,
          name: definition.name,
          documentType,
          content: definition.content,
          version: definition.version,
          active: true,
          createdById: createdById ?? null,
        },
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        continue;
      }
      throw error;
    }
  }
}
