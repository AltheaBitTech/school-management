import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DocumentOwnerType,
  DocumentType,
  GeneratedDocument,
  Organization,
  Prisma,
  Student,
  User,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { buildPaginationMeta } from '../common/dto/pagination-query.dto';
import { FilesService } from '../files/files.service';
import { buildContentDispositionFilename } from '../files/utils/filename.util';
import { PrismaService } from '../prisma/prisma.service';
import { StudentsService } from '../students/students.service';
import { getStudentDisplayName } from '../students/utils/student-display.util';
import { DOCUMENT_ERROR_CODES } from './constants/document.constants';
import { GeneratedDocumentResponseDto } from './dto/document-response.dto';
import { ListDocumentsQueryDto } from './dto/list-documents-query.dto';
import { generatePdfBuffer } from './services/pdf-generator.service';
import { ensureDefaultDocumentTemplates } from './utils/document-template-seed.util';
import {
  parseDocumentTemplateContent,
  resolveTemplateText,
} from './utils/template-resolver.util';

type GeneratedDocumentFileSummary = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  organizationId?: string;
};

type GeneratedDocumentWithRelations = GeneratedDocument & {
  generatedBy: Pick<User, 'id' | 'email'>;
  file: GeneratedDocumentFileSummary;
};

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly studentsService: StudentsService,
    private readonly filesService: FilesService,
  ) {}

  async ensureTemplatesForOrganization(organizationId: string, createdById?: string): Promise<void> {
    await ensureDefaultDocumentTemplates(this.prisma, organizationId, createdById);
  }

  async list(organizationId: string, query: ListDocumentsQueryDto) {
    const where: Prisma.GeneratedDocumentWhereInput = {
      organizationId,
      ...(query.documentType ? { documentType: query.documentType } : {}),
      ...(query.studentId
        ? {
            ownerType: DocumentOwnerType.STUDENT,
            ownerId: query.studentId,
          }
        : {}),
      ...(query.fromDate || query.toDate
        ? {
            createdAt: {
              ...(query.fromDate ? { gte: new Date(`${query.fromDate}T00:00:00.000Z`) } : {}),
              ...(query.toDate ? { lte: new Date(`${query.toDate}T23:59:59.999Z`) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.generatedDocument.findMany({
        where,
        include: {
          generatedBy: {
            select: { id: true, email: true },
          },
          file: {
            select: {
              id: true,
              originalName: true,
              mimeType: true,
              size: true,
              organizationId: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.generatedDocument.count({ where }),
    ]);

    const studentMap = await this.loadStudentSummaries(
      organizationId,
      items.filter((item) => item.ownerType === DocumentOwnerType.STUDENT).map((item) => item.ownerId),
    );

    return {
      data: items.map((item) => this.toDto(item, studentMap.get(item.ownerId))),
      meta: buildPaginationMeta(query.page, query.pageSize, total),
    };
  }

  async findById(organizationId: string, documentId: string): Promise<GeneratedDocumentResponseDto> {
    const document = await this.findDocumentRecord(organizationId, documentId);
    const student =
      document.ownerType === DocumentOwnerType.STUDENT
        ? await this.studentsService.findById(organizationId, document.ownerId).catch(() => null)
        : null;

    return this.toDto(document, student);
  }

  async generateBonafide(
    organizationId: string,
    actor: AuthenticatedUser,
    studentId: string,
  ): Promise<GeneratedDocumentResponseDto> {
    const student = await this.studentsService.assertActiveStudent(organizationId, studentId);
    const organization = await this.getOrganization(organizationId);
    const template = await this.findActiveTemplate(organizationId, DocumentType.BONAFIDE_CERTIFICATE);

    const generatedAt = new Date();
    const parsedTemplate = parseDocumentTemplateContent(template.content);
    const resolvedTemplate = resolveTemplateText(parsedTemplate, {
      student,
      organization,
      generatedAt,
    });

    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await generatePdfBuffer(resolvedTemplate);
    } catch (error: unknown) {
      this.logger.error(
        'PDF generation failed for bonafide certificate',
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException({
        code: DOCUMENT_ERROR_CODES.DOCUMENT_GENERATION_FAILED,
        message: 'Failed to generate document PDF',
      });
    }

    let storedFile;
    try {
      storedFile = await this.filesService.storeBuffer(
        organizationId,
        actor,
        pdfBuffer,
        `bonafide-${student.studentCode}.pdf`,
      );
    } catch (error: unknown) {
      if (error instanceof InternalServerErrorException) {
        throw new InternalServerErrorException({
          code: DOCUMENT_ERROR_CODES.DOCUMENT_GENERATION_FAILED,
          message: 'Failed to store generated document PDF',
        });
      }

      throw error;
    }

    try {
      const created = await this.prisma.generatedDocument.create({
        data: {
          organizationId,
          templateId: template.id,
          templateVersion: template.version,
          documentType: DocumentType.BONAFIDE_CERTIFICATE,
          ownerType: DocumentOwnerType.STUDENT,
          ownerId: student.id,
          fileId: storedFile.id,
          generatedByUserId: actor.userId,
        },
        include: {
          generatedBy: {
            select: { id: true, email: true },
          },
          file: {
            select: {
              id: true,
              originalName: true,
              mimeType: true,
              size: true,
              organizationId: true,
            },
          },
        },
      });

      return this.toDto(created, student);
    } catch (error: unknown) {
      await this.filesService.delete(organizationId, storedFile.id).catch((deleteError: unknown) => {
        this.logger.error(
          `Failed to clean up orphaned generated file ${storedFile.id}`,
          deleteError instanceof Error ? deleteError.stack : undefined,
        );
      });

      this.logger.error(
        `Failed to persist generated document metadata for file ${storedFile.id}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException({
        code: DOCUMENT_ERROR_CODES.DOCUMENT_GENERATION_FAILED,
        message: 'Failed to persist generated document metadata',
      });
    }
  }

  async download(organizationId: string, documentId: string) {
    const document = await this.findDocumentRecord(organizationId, documentId);

    if (
      document.file.organizationId !== organizationId ||
      document.fileId !== document.file.id
    ) {
      throw new NotFoundException({
        code: DOCUMENT_ERROR_CODES.DOCUMENT_FILE_NOT_FOUND,
        message: 'Generated document file not found',
      });
    }

    const { file, buffer } = await this.filesService.download(organizationId, document.fileId);

    return {
      file,
      buffer,
      disposition: buildContentDispositionFilename(file.originalName),
    };
  }

  private async findDocumentRecord(
    organizationId: string,
    documentId: string,
  ): Promise<GeneratedDocumentWithRelations> {
    const document = await this.prisma.generatedDocument.findFirst({
      where: { id: documentId, organizationId },
      include: {
        generatedBy: {
          select: { id: true, email: true },
        },
        file: {
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            size: true,
            organizationId: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException({
        code: DOCUMENT_ERROR_CODES.DOCUMENT_NOT_FOUND,
        message: 'Generated document not found',
      });
    }

    return document;
  }

  private async findActiveTemplate(organizationId: string, documentType: DocumentType) {
    const template = await this.prisma.documentTemplate.findFirst({
      where: {
        organizationId,
        documentType,
        active: true,
      },
    });

    if (!template) {
      throw new NotFoundException({
        code: DOCUMENT_ERROR_CODES.DOCUMENT_TEMPLATE_NOT_FOUND,
        message: 'Active document template not found',
      });
    }

    return template;
  }

  private async getOrganization(organizationId: string): Promise<Organization> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException({
        code: DOCUMENT_ERROR_CODES.DOCUMENT_GENERATION_FAILED,
        message: 'Organization not found',
      });
    }

    return organization;
  }

  private async loadStudentSummaries(organizationId: string, studentIds: string[]) {
    const uniqueIds = [...new Set(studentIds)];
    const students =
      uniqueIds.length === 0
        ? []
        : await this.prisma.student.findMany({
            where: {
              organizationId,
              id: { in: uniqueIds },
            },
          });

    return new Map(students.map((student) => [student.id, student]));
  }

  private toDto(
    document: GeneratedDocumentWithRelations,
    student: Student | null | undefined,
  ): GeneratedDocumentResponseDto {
    return {
      id: document.id,
      documentType: document.documentType,
      ownerType: document.ownerType,
      ownerId: document.ownerId,
      templateId: document.templateId,
      templateVersion: document.templateVersion,
      status: document.status,
      generatedByUserId: document.generatedByUserId,
      createdAt: document.createdAt.toISOString(),
      generatedBy: document.generatedBy,
      file: document.file,
      ...(student
        ? {
            student: {
              id: student.id,
              studentCode: student.studentCode,
              firstName: student.firstName,
              lastName: student.lastName,
              displayName: student.displayName,
              className: student.className,
            },
          }
        : {}),
    };
  }
}

export function formatDocumentStudentName(student: Pick<Student, 'firstName' | 'lastName' | 'displayName'>): string {
  return getStudentDisplayName(student);
}
