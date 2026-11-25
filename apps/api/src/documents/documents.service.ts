import { randomUUID } from 'crypto';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DocumentOwnerType,
  DocumentType,
  EmploymentStatus,
  GeneratedDocument,
  Prisma,
  Staff,
  Student,
  StudentStatus,
  User,
  VisitorStatus,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { buildPaginationMeta } from '../common/dto/pagination-query.dto';
import { FilesService } from '../files/files.service';
import { buildContentDispositionFilename } from '../files/utils/filename.util';
import { PrismaService } from '../prisma/prisma.service';
import { StaffService } from '../staff/staff.service';
import { getStudentDisplayName } from '../students/utils/student-display.util';
import { StudentsService } from '../students/students.service';
import { VisitorsService } from '../visitors/visitors.service';
import {
  DOCUMENT_ERROR_CODES,
  documentTypeFileSlug,
  resolveDocumentOwnerType,
} from './constants/document.constants';
import { findUnknownPlaceholders, renderStoredTemplate } from './utils/template-resolver.util';
import { GeneratedDocumentResponseDto } from './dto/document-response.dto';
import { GenerateDocumentDto } from './dto/generate-document.dto';
import { ListDocumentsQueryDto } from './dto/list-documents-query.dto';
import { ListDocumentSubjectsQueryDto } from './dto/list-document-subjects-query.dto';
import { buildDocumentSubjectSearchWhere } from './utils/document-subject-search.util';
import {
  generateBonafidePdf,
  generateCharacterCertificatePdf,
  generateExperienceLetterPdf,
  generateSalaryCertificatePdf,
  generateIdCardPdf,
  generateVisitorPassPdf,
} from './services/pdf-generator.service';
import {
  addHours,
  buildOrganizationBlock,
  currentAcademicYear,
  formatCurrencyInr,
  formatDocumentDate,
  formatDocumentDateTime,
  formatSalaryMonth,
  formatStaffDisplayName,
  shortDocumentReference,
  splitClassName,
} from './utils/document-format.util';
import { ensureDefaultDocumentTemplates } from './utils/document-template-seed.util';
import { DocumentNotificationService } from './document-notification.service';
import { resolveTerminology } from '../common/terminology/terminology';

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
    private readonly staffService: StaffService,
    private readonly visitorsService: VisitorsService,
    private readonly filesService: FilesService,
    private readonly documentNotificationService: DocumentNotificationService,
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
          generatedBy: { select: { id: true, email: true } },
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
    const staffMap = await this.loadStaffSummaries(
      organizationId,
      items.filter((item) => item.ownerType === DocumentOwnerType.STAFF).map((item) => item.ownerId),
    );
    const visitorMap = await this.loadVisitorSummaries(
      organizationId,
      items.filter((item) => item.ownerType === DocumentOwnerType.VISITOR).map((item) => item.ownerId),
    );

    return {
      data: items.map((item) =>
        this.toDto(item, {
          student: studentMap.get(item.ownerId),
          staff: staffMap.get(item.ownerId),
          visitor: visitorMap.get(item.ownerId),
        }),
      ),
      meta: buildPaginationMeta(query.page, query.pageSize, total),
    };
  }

  async findById(organizationId: string, documentId: string): Promise<GeneratedDocumentResponseDto> {
    const document = await this.findDocumentRecord(organizationId, documentId);
    const owners = await this.loadOwnersForDocument(organizationId, document);
    return this.toDto(document, owners);
  }

  async listGenerationSubjects(organizationId: string, query: ListDocumentSubjectsQueryDto) {
    const where = buildDocumentSubjectSearchWhere(organizationId, query.ownerType, query.search);
    const skip = (query.page - 1) * query.pageSize;
    const take = query.pageSize;

    if (query.ownerType === DocumentOwnerType.STUDENT) {
      const studentWhere = where as Prisma.StudentWhereInput;
      const [rows, total] = await Promise.all([
        this.prisma.student.findMany({
          where: studentWhere,
          select: { id: true, studentCode: true, firstName: true, lastName: true, displayName: true },
          orderBy: { studentCode: 'asc' },
          skip,
          take,
        }),
        this.prisma.student.count({ where: studentWhere }),
      ]);
      return {
        data: rows.map((row) => ({
          id: row.id,
          code: row.studentCode,
          label: getStudentDisplayName(row),
        })),
        meta: buildPaginationMeta(query.page, query.pageSize, total),
      };
    }

    if (query.ownerType === DocumentOwnerType.STAFF) {
      const staffWhere = where as Prisma.StaffWhereInput;
      const [rows, total] = await Promise.all([
        this.prisma.staff.findMany({
          where: staffWhere,
          select: { id: true, employeeCode: true, firstName: true, lastName: true, displayName: true },
          orderBy: { employeeCode: 'asc' },
          skip,
          take,
        }),
        this.prisma.staff.count({ where: staffWhere }),
      ]);
      return {
        data: rows.map((row) => ({
          id: row.id,
          code: row.employeeCode,
          label: row.displayName?.trim() || `${row.firstName} ${row.lastName}`.trim(),
        })),
        meta: buildPaginationMeta(query.page, query.pageSize, total),
      };
    }

    const visitorWhere = where as Prisma.VisitorWhereInput;
    const [rows, total] = await Promise.all([
      this.prisma.visitor.findMany({
        where: visitorWhere,
        select: { id: true, visitorCode: true, name: true },
        orderBy: { checkInAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.visitor.count({ where: visitorWhere }),
    ]);
    return {
      data: rows.map((row) => ({
        id: row.id,
        code: row.visitorCode,
        label: row.name,
      })),
      meta: buildPaginationMeta(query.page, query.pageSize, total),
    };
  }

  async generateBonafide(
    organizationId: string,
    actor: AuthenticatedUser,
    studentId: string,
  ): Promise<GeneratedDocumentResponseDto> {
    return this.generateDocument(organizationId, actor, {
      documentType: DocumentType.BONAFIDE_CERTIFICATE,
      ownerId: studentId,
    });
  }

  async generateDocument(
    organizationId: string,
    actor: AuthenticatedUser,
    dto: GenerateDocumentDto,
  ): Promise<GeneratedDocumentResponseDto> {
    const expectedOwnerType = resolveDocumentOwnerType(dto.documentType);
    const organizationContext = await this.getOrganizationContext(organizationId);
    const template = await this.findActiveTemplate(organizationId, dto.documentType);
    const generatedAt = new Date();
    const documentId = randomUUID();
    const common = {
      organization: organizationContext.organizationBlock,
      unitLabel: resolveTerminology(
        organizationContext.organization.institutionType,
        organizationContext.organization.settings?.terminology,
      ).unit,
      generatedDate: formatDocumentDate(generatedAt),
      documentId: shortDocumentReference(documentId),
      logo: organizationContext.logo,
    };

    let ownerType: DocumentOwnerType;
    let ownerId: string;
    let fileLabel: string;
    let pdfBuffer: Buffer;
    let student: Student | undefined;
    let staff: Staff | undefined;
    let visitorSummary: { id: string; visitorCode: string; name: string } | undefined;

    switch (dto.documentType) {
      case DocumentType.BONAFIDE_CERTIFICATE: {
        const activeStudent = await this.studentsService.assertActiveStudent(organizationId, dto.ownerId);
        student = activeStudent;
        ownerType = DocumentOwnerType.STUDENT;
        ownerId = activeStudent.id;
        fileLabel = activeStudent.studentCode;
        const classParts = splitClassName(activeStudent.className);
        pdfBuffer = await this.generatePdfSafely(() =>
          generateBonafidePdf({
            ...common,
            student: {
              name: getStudentDisplayName(activeStudent),
              admissionNumber: activeStudent.studentCode,
              class: classParts.class,
              section: classParts.section,
              academicYear: currentAcademicYear(generatedAt),
            },
            purpose: dto.purpose,
            ...this.copyFromTemplate(template.content, this.studentTemplateVariables(activeStudent, organizationContext.organization, generatedAt)),
          }),
        );
        break;
      }
      case DocumentType.CHARACTER_CERTIFICATE: {
        const activeStudent = await this.studentsService.assertActiveStudent(organizationId, dto.ownerId);
        student = activeStudent;
        ownerType = DocumentOwnerType.STUDENT;
        ownerId = activeStudent.id;
        fileLabel = activeStudent.studentCode;
        pdfBuffer = await this.generatePdfSafely(() =>
          generateCharacterCertificatePdf({
            ...common,
            student: {
              name: getStudentDisplayName(activeStudent),
              admissionNumber: activeStudent.studentCode,
              class: activeStudent.className ?? undefined,
              conduct: dto.conduct?.trim() || 'Good',
            },
            purpose: dto.purpose,
            ...this.copyFromTemplate(template.content, this.studentTemplateVariables(activeStudent, organizationContext.organization, generatedAt)),
          }),
        );
        break;
      }
      case DocumentType.EXPERIENCE_LETTER: {
        const staffRecord = await this.assertActiveStaff(organizationId, dto.ownerId);
        staff = staffRecord;
        ownerType = DocumentOwnerType.STAFF;
        ownerId = staffRecord.id;
        fileLabel = staffRecord.employeeCode;
        pdfBuffer = await this.generatePdfSafely(() =>
          generateExperienceLetterPdf({
            ...common,
            staff: {
              name: formatStaffDisplayName(staffRecord),
              designation: staffRecord.designation?.trim() || 'Staff Member',
              department: staffRecord.department?.name ?? 'General',
              joiningDate: staffRecord.joiningDate
                ? formatDocumentDate(staffRecord.joiningDate)
                : 'N/A',
              leavingDate: dto.leavingDate
                ? formatDocumentDate(new Date(dto.leavingDate))
                : staffRecord.lastWorkingDate
                  ? formatDocumentDate(staffRecord.lastWorkingDate)
                  : undefined,
              employeeCode: staffRecord.employeeCode,
            },
            relievingReason: dto.relievingReason,
            ...this.copyFromTemplate(template.content, this.staffTemplateVariables(staffRecord, organizationContext.organization, generatedAt)),
          }),
        );
        break;
      }
      case DocumentType.SALARY_CERTIFICATE: {
        if (dto.salaryAmount === undefined || dto.salaryAmount === null) {
          throw new BadRequestException({
            code: DOCUMENT_ERROR_CODES.DOCUMENT_CONTEXT_INVALID,
            message: 'Salary amount is required for salary certificate generation',
          });
        }
        const staffRecord = await this.assertActiveStaff(organizationId, dto.ownerId);
        staff = staffRecord;
        ownerType = DocumentOwnerType.STAFF;
        ownerId = staffRecord.id;
        fileLabel = staffRecord.employeeCode;
        const salaryMonth =
          dto.salaryMonth ??
          `${generatedAt.getUTCFullYear()}-${String(generatedAt.getUTCMonth() + 1).padStart(2, '0')}`;
        const salaryAmount = dto.salaryAmount;
        pdfBuffer = await this.generatePdfSafely(() =>
          generateSalaryCertificatePdf({
            ...common,
            staff: {
              name: formatStaffDisplayName(staffRecord),
              designation: staffRecord.designation?.trim() || 'Staff Member',
              department: staffRecord.department?.name ?? 'General',
              employeeCode: staffRecord.employeeCode,
              monthlySalary: formatCurrencyInr(salaryAmount),
              salaryMonth: formatSalaryMonth(salaryMonth),
            },
          purpose: dto.purpose,
          ...this.copyFromTemplate(template.content, this.staffTemplateVariables(staffRecord, organizationContext.organization, generatedAt)),
        }),
      );
      break;
    }
    case DocumentType.VISITOR_PASS: {
        const visitor = await this.visitorsService.findById(organizationId, dto.ownerId);
        if (
          visitor.status !== VisitorStatus.CHECKED_IN &&
          visitor.status !== VisitorStatus.CHECKED_OUT
        ) {
          throw new BadRequestException({
            code: DOCUMENT_ERROR_CODES.DOCUMENT_OWNER_INVALID,
            message: 'Visitor pass can only be generated for checked-in visitors',
          });
        }
        ownerType = DocumentOwnerType.VISITOR;
        ownerId = visitor.id;
        fileLabel = visitor.visitorCode;
        visitorSummary = { id: visitor.id, visitorCode: visitor.visitorCode, name: visitor.name };
        const validUntil = addHours(new Date(visitor.checkInAt), 8);
        pdfBuffer = await this.generatePdfSafely(() =>
          generateVisitorPassPdf({
            ...common,
            visitor: {
              name: visitor.name,
              mobile: visitor.mobile,
              organization: visitor.organizationName ?? undefined,
              purpose: visitor.purpose,
              host: formatStaffDisplayName(visitor.hostStaff),
              checkInTime: formatDocumentDateTime(new Date(visitor.checkInAt)),
              validUntil: formatDocumentDateTime(validUntil),
              visitorId: visitor.visitorCode,
            },
          }),
        );
        break;
      }
      case DocumentType.STUDENT_ID_CARD: {
        const activeStudent = await this.studentsService.assertActiveStudent(organizationId, dto.ownerId);
        student = activeStudent;
        ownerType = DocumentOwnerType.STUDENT;
        ownerId = activeStudent.id;
        fileLabel = activeStudent.studentCode;
        const classParts = splitClassName(activeStudent.className ?? activeStudent.studentClass);
        const layout = this.readIdCardLayout(organizationContext.organization.settings?.documentSettings);
        pdfBuffer = await this.generatePdfSafely(() =>
          generateIdCardPdf({
            ...common,
            kind: 'student',
            layout,
            person: {
              name: getStudentDisplayName(activeStudent),
              code: activeStudent.studentCode,
              line2: [classParts.class, classParts.section].filter(Boolean).join(' · ') || undefined,
              line3: activeStudent.academicYear ?? currentAcademicYear(generatedAt),
            },
          }),
        );
        break;
      }
      case DocumentType.STAFF_ID_CARD: {
        const staffRecord = await this.assertActiveStaff(organizationId, dto.ownerId);
        staff = staffRecord;
        ownerType = DocumentOwnerType.STAFF;
        ownerId = staffRecord.id;
        fileLabel = staffRecord.employeeCode;
        const layout = this.readIdCardLayout(organizationContext.organization.settings?.documentSettings);
        const photo =
          layout.showPhoto && staffRecord.photoFileId
            ? await this.optionalPortrait(organizationId, staffRecord.photoFileId)
            : undefined;
        pdfBuffer = await this.generatePdfSafely(() =>
          generateIdCardPdf({
            ...common,
            kind: 'staff',
            layout,
            photo,
            person: {
              name: formatStaffDisplayName(staffRecord),
              code: staffRecord.employeeCode,
              line2: staffRecord.designation?.trim() || 'Staff',
              line3: staffRecord.department?.name ?? undefined,
            },
          }),
        );
        break;
      }
      default:
        throw new BadRequestException({
          code: DOCUMENT_ERROR_CODES.DOCUMENT_TYPE_NOT_SUPPORTED,
          message: 'Document type is not supported',
        });
    }

    if (expectedOwnerType !== ownerType) {
      throw new BadRequestException({
        code: DOCUMENT_ERROR_CODES.DOCUMENT_OWNER_INVALID,
        message: 'Document owner does not match document type',
      });
    }

    const slug = documentTypeFileSlug(dto.documentType);
    const storedFile = await this.storeGeneratedFile(
      organizationId,
      actor,
      pdfBuffer,
      `${slug}-${fileLabel}.pdf`,
    );

    try {
      const created = await this.prisma.generatedDocument.create({
        data: {
          id: documentId,
          organizationId,
          templateId: template.id,
          templateVersion: template.version,
          documentType: dto.documentType,
          ownerType,
          ownerId,
          fileId: storedFile.id,
          generatedByUserId: actor.userId,
        },
        include: {
          generatedBy: { select: { id: true, email: true } },
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

      const dtoResponse = this.toDto(created, { student, staff, visitor: visitorSummary });
      void this.documentNotificationService
        .notifyGenerated({
          organizationId,
          recipientUserId: actor.userId,
          documentId: created.id,
          documentType: dto.documentType,
          ownerLabel: fileLabel,
        })
        .catch(() => undefined);
      return dtoResponse;
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

  private async generatePdfSafely(factory: () => Promise<Buffer>): Promise<Buffer> {
    try {
      return await factory();
    } catch (error: unknown) {
      this.logger.error(
        'PDF generation failed',
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException({
        code: DOCUMENT_ERROR_CODES.DOCUMENT_GENERATION_FAILED,
        message: 'Failed to generate document PDF',
      });
    }
  }

  private async storeGeneratedFile(
    organizationId: string,
    actor: AuthenticatedUser,
    pdfBuffer: Buffer,
    filename: string,
  ) {
    try {
      return await this.filesService.storeBuffer(organizationId, actor, pdfBuffer, filename);
    } catch (error: unknown) {
      if (error instanceof InternalServerErrorException) {
        throw new InternalServerErrorException({
          code: DOCUMENT_ERROR_CODES.DOCUMENT_GENERATION_FAILED,
          message: 'Failed to store generated document PDF',
        });
      }
      throw error;
    }
  }

  private async assertActiveStaff(organizationId: string, staffId: string) {
    const staff = await this.staffService.findById(organizationId, staffId);
    if (staff.employmentStatus !== EmploymentStatus.ACTIVE) {
      throw new BadRequestException({
        code: DOCUMENT_ERROR_CODES.DOCUMENT_OWNER_INVALID,
        message: 'Staff member must be active to generate this document',
      });
    }
    return staff;
  }

  private async getOrganizationContext(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: { settings: true },
    });

    if (!organization) {
      throw new NotFoundException({
        code: DOCUMENT_ERROR_CODES.DOCUMENT_GENERATION_FAILED,
        message: 'Organization not found',
      });
    }

    let logo: Buffer | undefined;
    if (organization.settings?.logoFileId) {
      try {
        const downloaded = await this.filesService.download(
          organizationId,
          organization.settings.logoFileId,
        );
        if (downloaded.file.mimeType.startsWith('image/')) {
          logo = downloaded.buffer;
        }
      } catch {
        logo = undefined;
      }
    }

    return {
      organization,
      organizationBlock: buildOrganizationBlock(organization, organization.settings),
      logo,
    };
  }

  private async findDocumentRecord(
    organizationId: string,
    documentId: string,
  ): Promise<GeneratedDocumentWithRelations> {
    const document = await this.prisma.generatedDocument.findFirst({
      where: { id: documentId, organizationId },
      include: {
        generatedBy: { select: { id: true, email: true } },
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

  async listTemplates(organizationId: string) {
    await this.ensureTemplatesForOrganization(organizationId);
    const templates = await this.prisma.documentTemplate.findMany({
      where: { organizationId },
      orderBy: { documentType: 'asc' },
    });
    return {
      data: templates.map((template) => this.toTemplateDto(template)),
    };
  }

  async updateTemplate(
    organizationId: string,
    documentType: DocumentType,
    input: { title: string; body: string },
  ) {
    if (
      documentType === DocumentType.STUDENT_ID_CARD ||
      documentType === DocumentType.STAFF_ID_CARD ||
      documentType === DocumentType.VISITOR_PASS
    ) {
      throw new BadRequestException({
        code: DOCUMENT_ERROR_CODES.DOCUMENT_TYPE_NOT_SUPPORTED,
        message: 'This document uses layout settings, not a text template.',
      });
    }

    const title = input.title.trim();
    const body = input.body.trim();
    const unknown = findUnknownPlaceholders(`${title} ${body}`);
    if (!title) {
      throw new BadRequestException({
        code: DOCUMENT_ERROR_CODES.INVALID_TEMPLATE_CONTENT,
        message: 'Title is required',
      });
    }
    if (unknown.length > 0) {
      throw new BadRequestException({
        code: DOCUMENT_ERROR_CODES.INVALID_TEMPLATE_CONTENT,
        message: `Unknown placeholder: ${unknown.join(', ')}`,
      });
    }

    const existing = await this.findActiveTemplate(organizationId, documentType);
    const updated = await this.prisma.documentTemplate.update({
      where: { id: existing.id },
      data: {
        content: JSON.stringify({ title, body }),
        version: { increment: 1 },
      },
    });
    return this.toTemplateDto(updated);
  }

  private toTemplateDto(template: { documentType: DocumentType; name: string; version: number; content: string }) {
    const rendered = renderStoredTemplate(template.content, {});
    return {
      documentType: template.documentType,
      name: template.name,
      version: template.version,
      title: rendered?.title ?? template.name,
      body: rendered?.body ?? '',
      editable: template.documentType !== DocumentType.STUDENT_ID_CARD
        && template.documentType !== DocumentType.STAFF_ID_CARD
        && template.documentType !== DocumentType.VISITOR_PASS,
    };
  }

  private copyFromTemplate(content: string, variables: Record<string, string>) {
    const rendered = renderStoredTemplate(content, variables);
    if (!rendered) {
      return {};
    }
    return {
      heading: rendered.title || undefined,
      body: rendered.body || undefined,
    };
  }

  private studentTemplateVariables(student: Student, organization: { name: string; code: string }, generatedAt: Date) {
    const className = student.className?.trim() || student.studentClass?.trim() || '';
    return {
      'student.name': getStudentDisplayName(student),
      'student.admissionNumber': student.studentCode,
      'student.class': className || 'N/A',
      'student.classLine': className ? ` in class ${className}` : '',
      'organization.name': organization.name,
      'organization.code': organization.code,
      'generated.date': formatDocumentDate(generatedAt),
    };
  }

  private staffTemplateVariables(
    staff: Staff & { department?: { name: string } | null },
    organization: { name: string; code: string },
    generatedAt: Date,
  ) {
    return {
      'staff.name': formatStaffDisplayName(staff),
      'staff.employeeCode': staff.employeeCode,
      'staff.designation': staff.designation?.trim() || 'Staff',
      'staff.department': staff.department?.name ?? '',
      'organization.name': organization.name,
      'organization.code': organization.code,
      'generated.date': formatDocumentDate(generatedAt),
    };
  }

  private readIdCardLayout(documentSettings: Prisma.JsonValue | null | undefined) {
    const root = documentSettings && typeof documentSettings === 'object' && !Array.isArray(documentSettings)
      ? (documentSettings as { idCard?: { showPhoto?: unknown; showCode?: unknown; footerLine?: unknown } })
      : {};
    const idCard = root.idCard ?? {};
    const footerLine = typeof idCard.footerLine === 'string' ? idCard.footerLine.trim().slice(0, 80) : '';
    return {
      showPhoto: idCard.showPhoto !== false,
      showCode: idCard.showCode !== false,
      footerLine: footerLine || undefined,
    };
  }

  private async optionalPortrait(organizationId: string, fileId: string): Promise<Buffer | undefined> {
    try {
      const downloaded = await this.filesService.download(organizationId, fileId);
      if (!downloaded.file.mimeType.startsWith('image/')) {
        return undefined;
      }
      return downloaded.buffer;
    } catch {
      return undefined;
    }
  }

  private async findActiveTemplate(organizationId: string, documentType: DocumentType) {
    await this.ensureTemplatesForOrganization(organizationId);
    const template = await this.prisma.documentTemplate.findFirst({
      where: { organizationId, documentType, active: true },
    });

    if (!template) {
      throw new NotFoundException({
        code: DOCUMENT_ERROR_CODES.DOCUMENT_TEMPLATE_NOT_FOUND,
        message: 'Active document template not found',
      });
    }

    return template;
  }

  private async loadOwnersForDocument(
    organizationId: string,
    document: GeneratedDocument,
  ): Promise<{
    student?: Student | null;
    staff?: Staff | null;
    visitor?: { id: string; visitorCode: string; name: string } | null;
  }> {
    if (document.ownerType === DocumentOwnerType.STUDENT) {
      const student = await this.studentsService.findById(organizationId, document.ownerId).catch(() => null);
      return { student };
    }
    if (document.ownerType === DocumentOwnerType.STAFF) {
      const staff = await this.staffService.findById(organizationId, document.ownerId).catch(() => null);
      return { staff };
    }
    if (document.ownerType === DocumentOwnerType.VISITOR) {
      const visitor = await this.prisma.visitor.findFirst({
        where: { id: document.ownerId, organizationId },
        select: { id: true, visitorCode: true, name: true },
      });
      return { visitor };
    }
    return {};
  }

  private async loadStudentSummaries(organizationId: string, studentIds: string[]) {
    const uniqueIds = [...new Set(studentIds)];
    const students =
      uniqueIds.length === 0
        ? []
        : await this.prisma.student.findMany({
            where: { organizationId, id: { in: uniqueIds } },
          });
    return new Map(students.map((item) => [item.id, item]));
  }

  private async loadStaffSummaries(organizationId: string, staffIds: string[]) {
    const uniqueIds = [...new Set(staffIds)];
    const staff =
      uniqueIds.length === 0
        ? []
        : await this.prisma.staff.findMany({
            where: { organizationId, id: { in: uniqueIds } },
          });
    return new Map(staff.map((item) => [item.id, item]));
  }

  private async loadVisitorSummaries(organizationId: string, visitorIds: string[]) {
    const uniqueIds = [...new Set(visitorIds)];
    const visitors =
      uniqueIds.length === 0
        ? []
        : await this.prisma.visitor.findMany({
            where: { organizationId, id: { in: uniqueIds } },
            select: { id: true, visitorCode: true, name: true },
          });
    return new Map(visitors.map((item) => [item.id, item]));
  }

  private toDto(
    document: GeneratedDocumentWithRelations,
    owners: {
      student?: Student | null;
      staff?: Staff | null;
      visitor?: { id: string; visitorCode: string; name: string } | null;
    },
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
      ...(owners.student
        ? {
            student: {
              id: owners.student.id,
              studentCode: owners.student.studentCode,
              firstName: owners.student.firstName,
              lastName: owners.student.lastName,
              displayName: owners.student.displayName,
              className: owners.student.className,
            },
          }
        : {}),
      ...(owners.staff
        ? {
            staff: {
              id: owners.staff.id,
              employeeCode: owners.staff.employeeCode,
              firstName: owners.staff.firstName,
              lastName: owners.staff.lastName,
              displayName: owners.staff.displayName,
              designation: owners.staff.designation,
            },
          }
        : {}),
      ...(owners.visitor
        ? {
            visitor: {
              id: owners.visitor.id,
              visitorCode: owners.visitor.visitorCode,
              name: owners.visitor.name,
            },
          }
        : {}),
    };
  }
}

export function formatDocumentStudentName(student: Pick<Student, 'firstName' | 'lastName' | 'displayName'>): string {
  return getStudentDisplayName(student);
}
