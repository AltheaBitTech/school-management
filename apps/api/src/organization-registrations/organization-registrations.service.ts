import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrganizationStatus, UserStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../audit/constants/audit.constants';
import { AppConfig, CONFIGURATION_KEY } from '../config/configuration';
import { primaryFrontendOrigin } from '../config/cors.util';
import { PrismaService } from '../prisma/prisma.service';
import { ensureSchoolAdminRole } from '../roles/organization-role-seed.util';
import { ensureDefaultAssetCategories } from '../assets/utils/asset-category-seed.util';
import { ensureDefaultDocumentTemplates } from '../documents/utils/document-template-seed.util';
import { ensureDefaultLeaveApprovalWorkflow } from '../approvals/utils/approval-workflow-seed.util';
import { EMAIL_PROVIDER, EmailProvider } from '../notifications/providers/email-provider.interface';
import { PLATFORM_ORGANIZATION_CODE } from '../organizations/constants/organization.constants';
import { generateUniqueOrganizationCode } from '../organizations/utils/organization-code.util';
import { CreateOrganizationRegistrationRequestDto } from './dto/create-organization-registration-request.dto';
import { OrganizationRegistrationResponseDto } from './dto/organization-registration-response.dto';
import { ApproveOrganizationRegistrationResponseDto } from './dto/approve-organization-registration-response.dto';
import { RegistrationSignupContextDto } from './dto/registration-signup-context.dto';
import { renderRegistrationApprovedEmail } from './utils/registration-email.util';

/** School-admin role seed runs many permission upserts; serverless + pooler needs a longer interactive transaction window. */
const REGISTRATION_APPROVAL_TRANSACTION_OPTIONS = {
  maxWait: 15_000,
  timeout: 60_000,
} as const;

@Injectable()
export class OrganizationRegistrationsService {
  private readonly logger = new Logger(OrganizationRegistrationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
    @Inject(EMAIL_PROVIDER) private readonly emailProvider: EmailProvider,
  ) {}

  async submitRegistrationRequest(
    dto: CreateOrganizationRegistrationRequestDto,
  ): Promise<OrganizationRegistrationResponseDto> {
    const normalizedEmail = dto.contactEmail.trim().toLowerCase();

    const existingUser = await this.prisma.user.findFirst({
      where: {
        email: normalizedEmail,
      },
    });

    if (existingUser) {
      throw new ConflictException({
        code: 'EMAIL_ALREADY_REGISTERED',
        message: 'This email is already registered in an organization',
      });
    }

    const existingRequest = await this.prisma.organizationRegistrationRequest.findUnique({
      where: { contactEmail: normalizedEmail },
    });

    if (existingRequest && existingRequest.status === 'PENDING') {
      throw new ConflictException({
        code: 'REGISTRATION_ALREADY_PENDING',
        message: 'A registration request already exists for this email. Check your email for updates.',
      });
    }

    if (existingRequest && (existingRequest.status === 'REJECTED' || existingRequest.status === 'APPROVED')) {
      await this.prisma.organizationRegistrationRequest.delete({
        where: { id: existingRequest.id },
      });
    }

    try {
      const request = await this.prisma.organizationRegistrationRequest.create({
        data: {
          organizationName: dto.organizationName,
          contactEmail: normalizedEmail,
          contactFirstName: dto.contactFirstName,
          contactLastName: dto.contactLastName,
          contactPhone: dto.contactPhone,
          address: dto.address,
          city: dto.city,
          state: dto.state,
          country: dto.country || 'India',
          status: 'PENDING',
        },
      });

      return {
        id: request.id,
        status: request.status,
        createdAt: request.createdAt,
        message: 'Registration request submitted successfully. We will review and contact you within 1-2 business days.',
      };
    } catch {
      throw new InternalServerErrorException('Failed to submit registration request');
    }
  }

  async findById(id: string) {
    return this.prisma.organizationRegistrationRequest.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.organizationRegistrationRequest.findUnique({
      where: { contactEmail: email.toLowerCase().trim() },
    });
  }

  async findPending() {
    return this.prisma.organizationRegistrationRequest.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSignupContext(registrationRequestId: string): Promise<RegistrationSignupContextDto> {
    const registration = await this.prisma.organizationRegistrationRequest.findUnique({
      where: { id: registrationRequestId },
      include: {
        organization: true,
      },
    });

    if (!registration || registration.status !== 'APPROVED' || !registration.organization) {
      throw new UnauthorizedException('Invalid or unapproved registration request');
    }

    const adminUser = await this.prisma.user.findFirst({
      where: {
        organizationId: registration.organizationId!,
        email: registration.contactEmail,
      },
      select: {
        passwordHash: true,
      },
    });

    if (!adminUser) {
      throw new UnauthorizedException('Invalid or unapproved registration request');
    }

    return {
      registrationRequestId: registration.id,
      organizationName: registration.organizationName,
      contactEmail: registration.contactEmail,
      organizationCode: registration.organization.code,
      signupCompleted: Boolean(adminUser.passwordHash),
    };
  }

  async approveRegistration(
    registrationId: string,
    approvedByUserId: string,
  ): Promise<ApproveOrganizationRegistrationResponseDto> {
    const registration = await this.prisma.organizationRegistrationRequest.findUnique({
      where: { id: registrationId },
    });

    if (!registration) {
      throw new NotFoundException('Registration request not found');
    }

    if (registration.status !== 'PENDING') {
      throw new ConflictException('Can only approve pending requests');
    }

    let result: { organization: { id: string; name: string; code: string }; adminUser: { id: string; email: string } };

    try {
      result = await this.prisma.$transaction(async (tx) => {
      const code = await generateUniqueOrganizationCode(async (candidate) => {
        const existing = await tx.organization.findUnique({
          where: { code: candidate },
          select: { id: true },
        });
        return Boolean(existing);
      });

      const organization = await tx.organization.create({
        data: {
          name: registration.organizationName,
          code,
          status: OrganizationStatus.ACTIVE,
        },
      });

      await tx.organizationSettings.create({
        data: {
          organizationId: organization.id,
          onboardingCompleted: false,
        },
      });

      const adminUser = await tx.user.create({
        data: {
          organizationId: organization.id,
          email: registration.contactEmail,
          passwordHash: null,
          status: UserStatus.ACTIVE,
        },
      });

      const schoolAdminRole = await ensureSchoolAdminRole(tx, organization.id);
      await tx.userRole.create({
        data: {
          userId: adminUser.id,
          roleId: schoolAdminRole.id,
        },
      });

      await ensureDefaultAssetCategories(tx, organization.id);
      await ensureDefaultDocumentTemplates(tx, organization.id, adminUser.id);
      await ensureDefaultLeaveApprovalWorkflow(tx, organization.id);

      await tx.organizationRegistrationRequest.update({
        where: { id: registrationId },
        data: {
          status: 'APPROVED',
          organizationId: organization.id,
          approvedAt: new Date(),
          approvedByUserId,
        },
      });

      await this.auditService.record(
        {
          organizationId: organization.id,
          actorUserId: approvedByUserId,
          action: AUDIT_ACTIONS.ORGANIZATION_REGISTRATION_APPROVED,
          entityType: AUDIT_ENTITY_TYPES.ORGANIZATION_REGISTRATION_REQUEST,
          entityId: registrationId,
          after: {
            organizationId: organization.id,
            organizationCode: organization.code,
            adminUserId: adminUser.id,
            contactEmail: registration.contactEmail,
          },
        },
        tx,
      );

      return { organization, adminUser };
      }, REGISTRATION_APPROVAL_TRANSACTION_OPTIONS);
    } catch (error: unknown) {
      this.logger.error(
        {
          registrationId,
          approvedByUserId,
          message: error instanceof Error ? error.message : String(error),
          name: error instanceof Error ? error.name : undefined,
        },
        'Organization registration approval transaction failed',
      );
      throw error;
    }

    const completeSignupUrl = this.buildCompleteSignupUrl(
      registrationId,
      registration.contactEmail,
      result.organization.code,
    );

    const emailContent = renderRegistrationApprovedEmail({
      organizationName: result.organization.name,
      organizationCode: result.organization.code,
      completeSignupUrl,
    });

    try {
      await this.emailProvider.sendEmail({
        to: registration.contactEmail,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
      });
    } catch {
      // Email delivery should not block approval.
    }

    return {
      organizationId: result.organization.id,
      organizationName: result.organization.name,
      organizationCode: result.organization.code,
      adminUserId: result.adminUser.id,
      adminEmail: result.adminUser.email,
      completeSignupUrl,
    };
  }

  async rejectRegistration(
    registrationId: string,
    rejectionReason: string,
    rejectedByUserId: string,
  ) {
    const registration = await this.prisma.organizationRegistrationRequest.findUnique({
      where: { id: registrationId },
    });

    if (!registration) {
      throw new NotFoundException('Registration request not found');
    }

    if (registration.status !== 'PENDING') {
      throw new ConflictException('Can only reject pending requests');
    }

    const updated = await this.prisma.organizationRegistrationRequest.update({
      where: { id: registrationId },
      data: {
        status: 'REJECTED',
        rejectionReason,
      },
    });

    const platformOrganization = await this.prisma.organization.findFirst({
      where: { code: PLATFORM_ORGANIZATION_CODE },
      select: { id: true },
    });

    if (platformOrganization) {
      await this.auditService.record({
        organizationId: platformOrganization.id,
        actorUserId: rejectedByUserId,
        action: AUDIT_ACTIONS.ORGANIZATION_REGISTRATION_REJECTED,
        entityType: AUDIT_ENTITY_TYPES.ORGANIZATION_REGISTRATION_REQUEST,
        entityId: registrationId,
        metadata: {
          rejectionReason,
          contactEmail: registration.contactEmail,
          organizationName: registration.organizationName,
        },
      });
    }

    return updated;
  }

  private buildCompleteSignupUrl(
    registrationRequestId: string,
    contactEmail: string,
    organizationCode: string,
  ): string {
    const appConfig = this.configService.get<AppConfig>(CONFIGURATION_KEY);
    const frontendBaseUrl = primaryFrontendOrigin(appConfig?.corsOrigin ?? 'http://localhost:3000');
    const params = new URLSearchParams({
      requestId: registrationRequestId,
      email: contactEmail,
      orgCode: organizationCode,
    });

    return `${frontendBaseUrl}/complete-signup?${params.toString()}`;
  }
}
