import { Injectable, StreamableFile } from '@nestjs/common';
import { DocumentType } from '@prisma/client';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PermissionsService } from '../permissions/permissions.service';
import { StudentFeesService } from '../fees/student-fees.service';
import { StudentsService } from '../students/students.service';
import { DocumentsService } from '../documents/documents.service';
import { TransportService } from '../transport/transport.service';
import { StudentContextService } from './student-context.service';

@Injectable()
export class StudentSelfService {
  constructor(
    private readonly studentContextService: StudentContextService,
    private readonly studentsService: StudentsService,
    private readonly studentFeesService: StudentFeesService,
    private readonly permissionsService: PermissionsService,
    private readonly documentsService: DocumentsService,
    private readonly transportService: TransportService,
  ) {}

  async getTransport(user: AuthenticatedUser) {
    const student = await this.studentContextService.resolveStudentProfile(user);
    return this.transportService.currentForStudent(user.organizationId, student.id);
  }

  async getProfile(user: AuthenticatedUser) {
    const student = await this.studentContextService.resolveStudentProfile(user);
    return this.studentsService.toDto(student);
  }

  async listFees(user: AuthenticatedUser, query: PaginationQueryDto) {
    const student = await this.studentContextService.resolveStudentProfile(user);
    return this.studentFeesService.listForStudent(user.organizationId, student.id, query);
  }

  async downloadPaymentReceipt(
    user: AuthenticatedUser,
    studentFeeId: string,
    paymentId: string,
  ): Promise<StreamableFile> {
    await this.studentContextService.resolveStudentProfile(user);
    const permissions =
      (await this.permissionsService.getEffectivePermissions(
        user.userId,
        user.organizationId,
        user.activeRoleId ?? '',
      )) ?? [];
    const { buffer, filename } = await this.studentFeesService.downloadPaymentReceipt(
      user,
      studentFeeId,
      paymentId,
      permissions,
    );

    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${filename}"`,
      length: buffer.length,
    });
  }

  async generateBonafideCertificate(user: AuthenticatedUser, purpose?: string) {
    const student = await this.studentContextService.resolveStudentProfile(user);
    return this.documentsService.generateDocument(user.organizationId, user, {
      documentType: DocumentType.BONAFIDE_CERTIFICATE,
      ownerId: student.id,
      purpose,
    });
  }

  async generateIdCard(user: AuthenticatedUser) {
    const student = await this.studentContextService.resolveStudentProfile(user);
    return this.documentsService.generateDocument(user.organizationId, user, {
      documentType: DocumentType.STUDENT_ID_CARD,
      ownerId: student.id,
    });
  }
}
