import { ForbiddenException, Injectable } from '@nestjs/common';
import { EmploymentStatus } from '@prisma/client';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { PLATFORM_ORGANIZATION_CODE } from '../organizations/constants/organization.constants';
import { PrismaService } from '../prisma/prisma.service';
import { STAFF_SELF_ERROR_CODES } from './constants/staff-self.constants';

export type ResolvedStaffProfile = {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  departmentId: string | null;
  department: { id: string; name: string } | null;
};

@Injectable()
export class StaffContextService {
  constructor(private readonly prisma: PrismaService) {}

  async assertOperationalOrganization(organizationId: string): Promise<void> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { code: true },
    });

    if (organization?.code === PLATFORM_ORGANIZATION_CODE) {
      throw new ForbiddenException({
        code: STAFF_SELF_ERROR_CODES.PLATFORM_ORGANIZATION,
        message: 'Staff self-service is not available for the platform organization',
      });
    }
  }

  async resolveStaffProfile(user: AuthenticatedUser): Promise<ResolvedStaffProfile> {
    await this.assertOperationalOrganization(user.organizationId);

    const staff = await this.prisma.staff.findFirst({
      where: {
        organizationId: user.organizationId,
        userId: user.userId,
      },
      include: {
        department: {
          select: { id: true, name: true },
        },
      },
    });

    if (!staff || staff.employmentStatus === EmploymentStatus.OFFBOARDED) {
      throw new ForbiddenException({
        code: STAFF_SELF_ERROR_CODES.STAFF_PROFILE_NOT_LINKED,
        message: 'No active staff profile is linked to your user account',
      });
    }

    return {
      id: staff.id,
      employeeCode: staff.employeeCode,
      firstName: staff.firstName,
      lastName: staff.lastName,
      displayName: staff.displayName,
      departmentId: staff.departmentId,
      department: staff.department,
    };
  }
}
