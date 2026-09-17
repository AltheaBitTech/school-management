import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Organization, OrganizationStatus, Prisma, UserStatus } from '@prisma/client';
import { PasswordService } from '../auth/services/password.service';
import { normalizeEmail } from '../auth/utils/email.util';
import { ensureDefaultAssetCategories } from '../assets/utils/asset-category-seed.util';
import { ensureDefaultDocumentTemplates } from '../documents/utils/document-template-seed.util';
import { ensureSchoolAdminRole } from '../roles/organization-role-seed.util';
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

        const schoolAdminRole = await ensureSchoolAdminRole(tx, organization.id);
        await ensureDefaultAssetCategories(tx, organization.id);
        await ensureDefaultDocumentTemplates(tx, organization.id, adminUser.id);

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
              message: 'A user with this email already exists in the organization',
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

  async getOrganizationForAuthenticatedUser(organizationId: string): Promise<Organization> {
    return this.getOrganizationById(organizationId);
  }

  toOrganizationSummary(organization: Organization) {
    return {
      id: organization.id,
      name: organization.name,
      code: organization.code,
      status: organization.status,
    };
  }
}
