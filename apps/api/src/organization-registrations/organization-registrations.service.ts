import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { InstitutionType, OrganizationStatus, UserStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../audit/constants/audit.constants';
import { AppConfig, CONFIGURATION_KEY } from '../config/configuration';
import { resolveFrontendBaseUrl } from '../config/frontend-url.util';
import { EmailDeliveryError, EmailDeliveryProblem } from '../notifications/email-delivery.error';
import { PrismaService } from '../prisma/prisma.service';
import { ensureAllOrganizationRoles, getOrganizationRoleByCode } from '../roles/organization-role-seed.util';
import { ORGANIZATION_ROLE_CODES } from '../permissions/constants/system-roles';
import { ensureDefaultAssetCategories } from '../assets/utils/asset-category-seed.util';
import { ensureDefaultDocumentTemplates } from '../documents/utils/document-template-seed.util';
import {
  ensureDefaultLeaveApprovalWorkflow,
  ensureDefaultOperationalApprovalWorkflows,
} from '../approvals/utils/approval-workflow-seed.util';
import { EMAIL_PROVIDER, EmailProvider } from '../notifications/providers/email-provider.interface';
import { PLATFORM_ORGANIZATION_CODE } from '../organizations/constants/organization.constants';
import {
  generateUniqueOrganizationCodeFromName,
  isValidOrganizationCode,
  normalizeOrganizationCode,
  pickAvailableOrganizationCode,
} from '../organizations/utils/organization-code.util';
import { SuggestOrganizationCodeResponseDto } from './dto/suggest-organization-code-response.dto';
import { CreateOrganizationRegistrationRequestDto } from './dto/create-organization-registration-request.dto';
import { OrganizationRegistrationResponseDto } from './dto/organization-registration-response.dto';
import { ApproveOrganizationRegistrationResponseDto } from './dto/approve-organization-registration-response.dto';
import { RegistrationSignupContextDto } from './dto/registration-signup-context.dto';
import { PasswordService } from '../auth/services/password.service';
import {
  renderRegistrationApprovedEmail,
  renderRegistrationReceivedEmail,
  renderRegistrationRejectedEmail,
} from './utils/registration-email.util';

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
    private readonly passwordService: PasswordService,
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

    const normalizedPhone = dto.contactPhone.trim();

    const existingByPhone = await this.prisma.organizationRegistrationRequest.findUnique({
      where: { contactPhone: normalizedPhone },
    });

    if (existingByPhone && existingByPhone.id !== existingRequest?.id) {
      if (existingByPhone.status === 'PENDING') {
        throw new ConflictException({
          code: 'REGISTRATION_PHONE_ALREADY_PENDING',
          message:
            'A registration request already exists for this phone number. Check your email for updates or use a different number.',
        });
      }

      if (existingByPhone.status === 'REJECTED' || existingByPhone.status === 'APPROVED') {
        await this.prisma.organizationRegistrationRequest.delete({
          where: { id: existingByPhone.id },
        });
      }
    }

    const preferredOrganizationCode = dto.preferredOrganizationCode
      ? normalizeOrganizationCode(dto.preferredOrganizationCode)
      : null;

    if (preferredOrganizationCode && !isValidOrganizationCode(preferredOrganizationCode)) {
      throw new BadRequestException({
        code: 'INVALID_ORGANIZATION_CODE',
        message: 'Institution code must be 3-64 characters of lowercase letters, numbers, or hyphens',
      });
    }

    if (
      preferredOrganizationCode &&
      (await this.isOrganizationCodeReserved(preferredOrganizationCode))
    ) {
      throw new ConflictException({
        code: 'ORGANIZATION_CODE_UNAVAILABLE',
        message: 'This institution code is already taken. Choose another code.',
      });
    }

    const adminPasswordHash = await this.passwordService.hash(dto.password);

    try {
      const request = await this.prisma.organizationRegistrationRequest.create({
        data: {
          organizationName: dto.organizationName,
          preferredOrganizationCode,
          institutionType: dto.institutionType ?? InstitutionType.SCHOOL,
          contactEmail: normalizedEmail,
          contactFirstName: dto.contactFirstName,
          contactLastName: dto.contactLastName,
          contactPhone: normalizedPhone,
          address: dto.address,
          city: dto.city,
          state: dto.state,
          country: dto.country || 'India',
          adminPasswordHash,
          status: 'PENDING',
        },
      });

      const emailDelivery = await this.sendRegistrationEmail(
        normalizedEmail,
        renderRegistrationReceivedEmail({
          recipientName: `${dto.contactFirstName} ${dto.contactLastName}`.trim(),
          organizationName: dto.organizationName,
        }),
        'registration_received',
      );

      return {
        id: request.id,
        status: request.status,
        createdAt: request.createdAt,
        message:
          'Registration request submitted successfully. We will review and contact you within 1-2 business days. After approval, sign in with your institution code, email, and the password you chose.',
        emailSent: emailDelivery.emailSent,
        emailError: emailDelivery.emailError,
      };
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const target = error.meta?.target;
        const fields = Array.isArray(target)
          ? target
          : typeof target === 'string'
            ? [target]
            : [];
        if (fields.some((field) => field === 'contactEmail' || field.includes('contactEmail'))) {
          throw new ConflictException({
            code: 'EMAIL_ALREADY_REGISTERED',
            message: 'A registration request with this email already exists.',
          });
        }
        if (fields.some((field) => field === 'contactPhone' || field.includes('contactPhone'))) {
          throw new ConflictException({
            code: 'REGISTRATION_PHONE_ALREADY_PENDING',
            message: 'A registration request with this phone number already exists.',
          });
        }
      }

      this.logger.error(
        error instanceof Error ? error.message : 'Unknown registration error',
        error instanceof Error ? error.stack : undefined,
      );
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

    const signupPreCompleted = Boolean(registration.adminPasswordHash);

    let result: {
      organization: { id: string; name: string; code: string };
      adminUser: { id: string; email: string };
      signupPreCompleted: boolean;
    };

    try {
      result = await this.prisma.$transaction(async (tx) => {
      const code = await generateUniqueOrganizationCodeFromName(
        registration.organizationName,
        registration.preferredOrganizationCode,
        async (candidate) =>
          this.isOrganizationCodeReserved(candidate, registrationId, tx),
      );

      const organization = await tx.organization.create({
        data: {
          name: registration.organizationName,
          code,
          institutionType: registration.institutionType,
          status: OrganizationStatus.ACTIVE,
        },
      });

      await tx.organizationSettings.create({
        data: {
          organizationId: organization.id,
          onboardingCompleted: false,
        },
      });

      const trialPlan = await tx.plan.findUnique({ where: { code: 'TRIAL' } });
      if (trialPlan) {
        await tx.organizationSubscription.create({
          data: { organizationId: organization.id, planId: trialPlan.id, status: 'TRIAL' },
        });
      }

      const adminUser = await tx.user.create({
        data: {
          organizationId: organization.id,
          email: registration.contactEmail,
          passwordHash: registration.adminPasswordHash,
          status: UserStatus.ACTIVE,
        },
      });

      await ensureAllOrganizationRoles(tx, organization.id);
      const schoolAdminRole = await getOrganizationRoleByCode(
        tx,
        organization.id,
        ORGANIZATION_ROLE_CODES.SCHOOL_ADMIN,
      );
      await tx.userRole.create({
        data: {
          userId: adminUser.id,
          roleId: schoolAdminRole.id,
        },
      });

      await ensureDefaultAssetCategories(tx, organization.id);
      await ensureDefaultDocumentTemplates(tx, organization.id, adminUser.id);
      await ensureDefaultLeaveApprovalWorkflow(tx, organization.id);
      await ensureDefaultOperationalApprovalWorkflows(tx, organization.id);

      await tx.organizationRegistrationRequest.update({
        where: { id: registrationId },
        data: {
          status: 'APPROVED',
          organizationId: organization.id,
          approvedAt: new Date(),
          approvedByUserId,
          adminPasswordHash: null,
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

      if (signupPreCompleted) {
        await this.auditService.record(
          {
            organizationId: organization.id,
            actorUserId: adminUser.id,
            action: AUDIT_ACTIONS.ORGANIZATION_SIGNUP_COMPLETED,
            entityType: AUDIT_ENTITY_TYPES.ORGANIZATION_REGISTRATION_REQUEST,
            entityId: registrationId,
            metadata: {
              email: adminUser.email,
              organizationCode: organization.code,
              source: 'registration_password',
            },
          },
          tx,
        );
      }

      return { organization, adminUser, signupPreCompleted };
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

    const loginUrl = this.buildLoginUrl(result.organization.code);

    const emailContent = renderRegistrationApprovedEmail({
      organizationName: result.organization.name,
      organizationCode: result.organization.code,
      completeSignupUrl,
      signupPreCompleted: result.signupPreCompleted,
      loginUrl,
      recipientName: `${registration.contactFirstName} ${registration.contactLastName}`.trim(),
    });

    const emailDelivery = await this.sendRegistrationEmail(
      registration.contactEmail,
      {
        ...emailContent,
      },
      'registration_approved',
    );

    return {
      organizationId: result.organization.id,
      organizationName: result.organization.name,
      organizationCode: result.organization.code,
      adminUserId: result.adminUser.id,
      adminEmail: result.adminUser.email,
      signupPreCompleted: result.signupPreCompleted,
      loginUrl,
      completeSignupUrl: result.signupPreCompleted ? undefined : completeSignupUrl,
      emailSent: emailDelivery.emailSent,
      emailError: emailDelivery.emailError,
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

    const emailDelivery = await this.sendRegistrationEmail(
      registration.contactEmail,
      renderRegistrationRejectedEmail({
        recipientName: `${registration.contactFirstName} ${registration.contactLastName}`.trim(),
        organizationName: registration.organizationName,
        rejectionReason,
      }),
      'registration_rejected',
    );

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

    return {
      ...updated,
      emailSent: emailDelivery.emailSent,
      emailError: emailDelivery.emailError,
    };
  }

  async suggestOrganizationCode(
    organizationName: string,
    preferredCode?: string,
  ): Promise<SuggestOrganizationCodeResponseDto> {
    const trimmedName = organizationName.trim();
    if (trimmedName.length < 3) {
      throw new BadRequestException({
        code: 'INVALID_ORGANIZATION_NAME',
        message: 'Institution name must be at least 3 characters to suggest a code',
      });
    }

    const preferred = preferredCode?.trim()
      ? normalizeOrganizationCode(preferredCode)
      : undefined;

    if (preferred && !isValidOrganizationCode(preferred)) {
      throw new BadRequestException({
        code: 'INVALID_ORGANIZATION_CODE',
        message: 'Institution code must be 3-64 characters of lowercase letters, numbers, or hyphens',
      });
    }

    const result = await pickAvailableOrganizationCode(
      trimmedName,
      preferred ?? null,
      (candidate) => this.isOrganizationCodeReserved(candidate),
    );

    return result;
  }

  private async isOrganizationCodeReserved(
    code: string,
    excludeRegistrationId?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<boolean> {
    const client = tx ?? this.prisma;
    const normalized = normalizeOrganizationCode(code);

    const existingOrg = await client.organization.findUnique({
      where: { code: normalized },
      select: { id: true },
    });
    if (existingOrg) {
      return true;
    }

    const pending = await client.organizationRegistrationRequest.findFirst({
      where: {
        preferredOrganizationCode: normalized,
        status: 'PENDING',
        ...(excludeRegistrationId ? { id: { not: excludeRegistrationId } } : {}),
      },
      select: { id: true },
    });

    return Boolean(pending);
  }

  private buildCompleteSignupUrl(
    registrationRequestId: string,
    contactEmail: string,
    organizationCode: string,
  ): string {
    const frontendBaseUrl = this.frontendBaseUrl();
    const params = new URLSearchParams({
      requestId: registrationRequestId,
      email: contactEmail,
      orgCode: organizationCode,
    });

    return `${frontendBaseUrl}/complete-signup?${params.toString()}`;
  }

  private buildLoginUrl(organizationCode: string): string {
    const params = new URLSearchParams({ orgCode: organizationCode });
    return `${this.frontendBaseUrl()}/login?${params.toString()}`;
  }

  private frontendBaseUrl(): string {
    const appConfig = this.configService.get<AppConfig>(CONFIGURATION_KEY);
    return resolveFrontendBaseUrl(appConfig?.corsOrigin, appConfig?.frontendUrl);
  }

  private async sendRegistrationEmail(
    to: string,
    emailContent: { subject: string; text: string; html: string },
    purpose: string,
  ): Promise<{ emailSent: boolean; emailError?: EmailDeliveryProblem }> {
    try {
      await this.emailProvider.sendEmail({
        to,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
        purpose,
      });
      return { emailSent: true };
    } catch (error: unknown) {
      const emailError =
        error instanceof EmailDeliveryError
          ? error.toProblem()
          : {
              code: 'UNKNOWN' as const,
              message: error instanceof Error ? error.message : 'The email could not be sent.',
            };
      this.logger.warn(
        JSON.stringify({
          action: 'registration.email_failed',
          purpose,
          code: emailError.code,
          message: emailError.message,
        }),
      );
      return { emailSent: false, emailError };
    }
  }
}
