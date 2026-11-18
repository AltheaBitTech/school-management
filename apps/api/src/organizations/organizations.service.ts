import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InstitutionType, Organization, OrganizationStatus, Prisma, UserStatus } from '@prisma/client';
import { resolveTerminology } from '../common/terminology/terminology';
import { PasswordService } from '../auth/services/password.service';
import { normalizeEmail } from '../auth/utils/email.util';
import { ensureDefaultAssetCategories } from '../assets/utils/asset-category-seed.util';
import { ensureDefaultDocumentTemplates } from '../documents/utils/document-template-seed.util';
import {
  ensureDefaultLeaveApprovalWorkflow,
  ensureDefaultOperationalApprovalWorkflows,
} from '../approvals/utils/approval-workflow-seed.util';
import { ensureAllOrganizationRoles, getOrganizationRoleByCode } from '../roles/organization-role-seed.util';
import { ORGANIZATION_ROLE_CODES } from '../permissions/constants/system-roles';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { ORGANIZATION_ERROR_CODES } from './constants/organization.constants';
import {
  isValidOrganizationCode,
  normalizeOrganizationCode,
} from './utils/organization-code.util';

export interface OrganizationBootstrapResult {
  organization: Organization;
  admin: {
    id: string;
    email: string;
    organizationId: string;
  };
}

type OrganizationWithTimezone = Organization & {
  settings?: { timezone: string; logoFileId?: string | null; terminology?: Prisma.JsonValue | null } | null;
};

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  async bootstrapOrganization(dto: CreateOrganizationDto): Promise<OrganizationBootstrapResult> {
    const normalizedCode = normalizeOrganizationCode(dto.code);
    const normalizedEmail = normalizeEmail(dto.admin.email);

    if (!isValidOrganizationCode(normalizedCode)) {
      throw new BadRequestException({
        code: ORGANIZATION_ERROR_CODES.INVALID_ORGANIZATION_CODE,
        message: 'Invalid organization code',
      });
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const organization = await tx.organization.create({
          data: {
            name: dto.name.trim(),
            code: normalizedCode,
            institutionType: dto.institutionType ?? InstitutionType.SCHOOL,
            status: OrganizationStatus.ACTIVE,
          },
        });

        await tx.organizationSettings.create({
          data: {
            organizationId: organization.id,
          },
        });

        const passwordHash = await this.passwordService.hash(dto.admin.password);
        const adminUser = await tx.user.create({
          data: {
            organizationId: organization.id,
            email: normalizedEmail,
            passwordHash,
            status: UserStatus.ACTIVE,
          },
        });

        await ensureAllOrganizationRoles(tx, organization.id);
        const schoolAdminRole = await getOrganizationRoleByCode(
          tx,
          organization.id,
          ORGANIZATION_ROLE_CODES.SCHOOL_ADMIN,
        );
        await ensureDefaultAssetCategories(tx, organization.id);
        await ensureDefaultDocumentTemplates(tx, organization.id, adminUser.id);
        await ensureDefaultLeaveApprovalWorkflow(tx, organization.id);
        await ensureDefaultOperationalApprovalWorkflows(tx, organization.id);

        await tx.userRole.create({
          data: {
            userId: adminUser.id,
            roleId: schoolAdminRole.id,
          },
        });

        return {
          organization,
          admin: {
            id: adminUser.id,
            email: adminUser.email,
            organizationId: adminUser.organizationId,
          },
        };
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const target = Array.isArray(error.meta?.target)
            ? error.meta.target.join(',')
            : String(error.meta?.target ?? '');

          if (target.includes('code')) {
            throw new ConflictException({
              code: ORGANIZATION_ERROR_CODES.DUPLICATE_ORGANIZATION_CODE,
              message: 'Organization code is already in use',
            });
          }

          if (target.includes('email')) {
            throw new ConflictException({
              code: ORGANIZATION_ERROR_CODES.DUPLICATE_USER_EMAIL,
              message: 'This email is already registered',
            });
          }
        }
      }

      if (error instanceof Error && error.message.includes('Missing permission definition')) {
        throw new InternalServerErrorException({
          code: ORGANIZATION_ERROR_CODES.BOOTSTRAP_FAILED,
          message: 'Organization bootstrap failed',
        });
      }

      throw error;
    }
  }

  async getOrganizationById(organizationId: string): Promise<Organization> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException({
        code: ORGANIZATION_ERROR_CODES.ORGANIZATION_NOT_FOUND,
        message: 'Organization not found',
      });
    }

    return organization;
  }

  async getOrganizationForAuthenticatedUser(organizationId: string): Promise<OrganizationWithTimezone> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: { settings: { select: { timezone: true, logoFileId: true, terminology: true } } },
    });

    if (!organization) {
      throw new NotFoundException({
        code: ORGANIZATION_ERROR_CODES.ORGANIZATION_NOT_FOUND,
        message: 'Organization not found',
      });
    }

    return organization;
  }

  toOrganizationSummary(organization: OrganizationWithTimezone) {
    return {
      id: organization.id,
      name: organization.name,
      code: organization.code,
      status: organization.status,
      institutionType: organization.institutionType,
      terminology: resolveTerminology(organization.institutionType, organization.settings?.terminology),
      timezone: organization.settings?.timezone ?? 'UTC',
      logoFileId: organization.settings?.logoFileId ?? null,
    };
  }

  async setLogo(organizationId: string, fileId: string): Promise<OrganizationWithTimezone> {
    const file = await this.prisma.file.findFirst({
      where: { id: fileId, organizationId },
    });
    if (!file || !file.mimeType.startsWith('image/')) {
      throw new BadRequestException({
        code: ORGANIZATION_ERROR_CODES.ORGANIZATION_NOT_FOUND,
        message: 'Logo must be an image file in this organization',
      });
    }

    await this.prisma.organizationSettings.update({
      where: { organizationId },
      data: { logoFileId: file.id },
    });

    return this.getOrganizationForAuthenticatedUser(organizationId);
  }

  async getDocumentSettings(organizationId: string) {
    const settings = await this.prisma.organizationSettings.findUnique({
      where: { organizationId },
    });
    return { data: readIdCardSettings(settings?.documentSettings) };
  }

  async updateDocumentSettings(
    organizationId: string,
    input: { showPhoto: boolean; showCode: boolean; footerLine?: string },
  ) {
    const settings = await this.prisma.organizationSettings.findUnique({
      where: { organizationId },
    });
    if (!settings) {
      throw new NotFoundException({
        code: ORGANIZATION_ERROR_CODES.ORGANIZATION_NOT_FOUND,
        message: 'Organization settings not found',
      });
    }
    const current =
      settings.documentSettings && typeof settings.documentSettings === 'object' && !Array.isArray(settings.documentSettings)
        ? (settings.documentSettings as Record<string, unknown>)
        : {};
    const footerLine = input.footerLine?.trim().slice(0, 80) ?? '';
    const documentSettings = {
      ...current,
      idCard: {
        showPhoto: input.showPhoto,
        showCode: input.showCode,
        footerLine,
      },
    };
    await this.prisma.organizationSettings.update({
      where: { organizationId },
      data: { documentSettings },
    });
    return { data: readIdCardSettings(documentSettings) };
  }
}

function readIdCardSettings(value: unknown) {
  const root = value && typeof value === 'object' && !Array.isArray(value)
    ? (value as { idCard?: { showPhoto?: unknown; showCode?: unknown; footerLine?: unknown } })
    : {};
  const idCard = root.idCard ?? {};
  return {
    showPhoto: idCard.showPhoto !== false,
    showCode: idCard.showCode !== false,
    footerLine: typeof idCard.footerLine === 'string' ? idCard.footerLine : '',
  };
}
