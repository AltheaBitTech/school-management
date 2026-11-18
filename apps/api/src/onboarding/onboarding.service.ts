import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PLATFORM_ORGANIZATION_CODE } from '../organizations/constants/organization.constants';
import { ONBOARDING_ERROR_CODES } from './constants/onboarding.constants';
import { UpdateOnboardingSetupDto } from './dto/update-onboarding-setup.dto';
import { isValidTimezone } from './utils/timezone.util';

export interface OnboardingState {
  onboardingCompleted: boolean;
  organizationId: string;
  organizationName: string;
  organizationCode: string;
  timezone: string;
}

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async getState(organizationId: string): Promise<OnboardingState> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        settings: {
          select: {
            onboardingCompleted: true,
            timezone: true,
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException({
        code: ONBOARDING_ERROR_CODES.ORGANIZATION_NOT_FOUND,
        message: 'Organization not found',
      });
    }

    this.assertSchoolOrganization(organization.code);

    return {
      onboardingCompleted: organization.settings?.onboardingCompleted ?? true,
      organizationId: organization.id,
      organizationName: organization.name,
      organizationCode: organization.code,
      timezone: organization.settings?.timezone ?? 'UTC',
    };
  }

  async updateSetup(organizationId: string, dto: UpdateOnboardingSetupDto): Promise<OnboardingState> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: { settings: true },
    });

    if (!organization || !organization.settings) {
      throw new NotFoundException({
        code: ONBOARDING_ERROR_CODES.ORGANIZATION_NOT_FOUND,
        message: 'Organization not found',
      });
    }

    this.assertSchoolOrganization(organization.code);

    if (organization.settings.onboardingCompleted) {
      throw new BadRequestException({
        code: ONBOARDING_ERROR_CODES.ONBOARDING_ALREADY_COMPLETED,
        message: 'Onboarding has already been completed',
      });
    }

    if (dto.timezone && !isValidTimezone(dto.timezone)) {
      throw new BadRequestException({
        code: ONBOARDING_ERROR_CODES.INVALID_TIMEZONE,
        message: 'Invalid timezone',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      if (dto.organizationName) {
        await tx.organization.update({
          where: { id: organizationId },
          data: { name: dto.organizationName.trim() },
        });
      }

      if (dto.timezone) {
        await tx.organizationSettings.update({
          where: { organizationId },
          data: { timezone: dto.timezone },
        });
      }
    });

    return this.getState(organizationId);
  }

  async finish(organizationId: string): Promise<OnboardingState> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: { settings: true },
    });

    if (!organization || !organization.settings) {
      throw new NotFoundException({
        code: ONBOARDING_ERROR_CODES.ORGANIZATION_NOT_FOUND,
        message: 'Organization not found',
      });
    }

    this.assertSchoolOrganization(organization.code);

    if (!organization.settings.onboardingCompleted) {
      await this.prisma.organizationSettings.update({
        where: { organizationId },
        data: { onboardingCompleted: true },
      });
    }

    return this.getState(organizationId);
  }

  private assertSchoolOrganization(organizationCode: string): void {
    if (organizationCode === PLATFORM_ORGANIZATION_CODE) {
      throw new ForbiddenException({
        code: ONBOARDING_ERROR_CODES.PLATFORM_ORGANIZATION,
        message: 'Platform organizations do not use institution onboarding',
      });
    }
  }
}
