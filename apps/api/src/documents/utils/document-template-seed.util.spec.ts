import { DocumentType, Prisma } from '@prisma/client';
import { DOCUMENT_TEMPLATE_DEFINITIONS } from '../constants/document.constants';
import { ensureDefaultDocumentTemplates } from './document-template-seed.util';

describe('ensureDefaultDocumentTemplates', () => {
  it('creates only the document types the organization does not already have', async () => {
    const created: DocumentType[] = [];
    const client = {
      documentTemplate: {
        findUnique: jest.fn(async ({ where }: { where: { organizationId_documentType: { documentType: DocumentType } } }) => {
          if (where.organizationId_documentType.documentType === DocumentType.BONAFIDE_CERTIFICATE) {
            return { id: 'existing-bonafide' };
          }
          return null;
        }),
        create: jest.fn(async ({ data }: { data: { documentType: DocumentType; content: string; name: string } }) => {
          created.push(data.documentType);
          expect(data.name).toBe(DOCUMENT_TEMPLATE_DEFINITIONS[data.documentType].name);
          expect(data.content).toBe(DOCUMENT_TEMPLATE_DEFINITIONS[data.documentType].content);
          return { id: data.documentType };
        }),
      },
    };

    await ensureDefaultDocumentTemplates(client as never, 'org-1', 'user-1');

    expect(created).not.toContain(DocumentType.BONAFIDE_CERTIFICATE);
    expect(created).toContain(DocumentType.STAFF_ID_CARD);
    expect(created).toContain(DocumentType.STUDENT_ID_CARD);
    expect(client.documentTemplate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          documentType: DocumentType.STAFF_ID_CARD,
          createdById: 'user-1',
          active: true,
        }),
      }),
    );
  });

  it('leaves an existing template unchanged when another request creates it first', async () => {
    const client = {
      documentTemplate: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockRejectedValue(
          new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
            code: 'P2002',
            clientVersion: '6.19.3',
          }),
        ),
      },
    };

    await expect(ensureDefaultDocumentTemplates(client as never, 'org-1')).resolves.toBeUndefined();
  });
});
