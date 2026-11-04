import { ForbiddenException, Injectable } from '@nestjs/common';
import { Student, StudentStatus } from '@prisma/client';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { PLATFORM_ORGANIZATION_CODE } from '../organizations/constants/organization.constants';
import { PrismaService } from '../prisma/prisma.service';
import { STUDENT_SELF_ERROR_CODES } from './constants/student-self.constants';

@Injectable()
export class StudentContextService {
  constructor(private readonly prisma: PrismaService) {}

  async assertOperationalOrganization(organizationId: string): Promise<void> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { code: true },
    });

    if (organization?.code === PLATFORM_ORGANIZATION_CODE) {
      throw new ForbiddenException({
        code: STUDENT_SELF_ERROR_CODES.PLATFORM_ORGANIZATION,
        message: 'Student self-service is not available for the platform organization',
      });
    }
  }

  async resolveStudentProfile(user: AuthenticatedUser): Promise<Student> {
    await this.assertOperationalOrganization(user.organizationId);

    const student = await this.prisma.student.findFirst({
      where: {
        organizationId: user.organizationId,
        userId: user.userId,
      },
    });

    if (!student || student.status === StudentStatus.INACTIVE) {
      throw new ForbiddenException({
        code: STUDENT_SELF_ERROR_CODES.STUDENT_PROFILE_NOT_LINKED,
        message: 'No active student profile is linked to your user account',
      });
    }

    return student;
  }
}
