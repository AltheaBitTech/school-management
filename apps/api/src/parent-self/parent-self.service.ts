import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { PrismaService } from '../prisma/prisma.service';
import { getStudentDisplayName } from '../students/utils/student-display.util';

@Injectable()
export class ParentSelfService {
  constructor(private readonly prisma: PrismaService) {}

  async listChildren(user: AuthenticatedUser) {
    const links = await this.prisma.parentStudentLink.findMany({
      where: { organizationId: user.organizationId, parentUserId: user.userId },
      include: { student: true },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: links.map((link) => ({
        linkId: link.id,
        student: {
          id: link.student.id,
          studentCode: link.student.studentCode,
          name: getStudentDisplayName(link.student),
          className: link.student.className,
          studentClass: link.student.studentClass,
          section: link.student.section,
          status: link.student.status,
        },
      })),
    };
  }

  async listLinkedParents(organizationId: string, studentId: string) {
    await this.requireStudent(organizationId, studentId);
    const links = await this.prisma.parentStudentLink.findMany({
      where: { organizationId, studentId },
      include: {
        parent: {
          select: {
            id: true,
            email: true,
            staffProfile: {
              select: { displayName: true, firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: links.map((link) => ({
        linkId: link.id,
        parentUserId: link.parent.id,
        email: link.parent.email,
        name: this.parentDisplayName(link.parent),
      })),
    };
  }

  async searchParentCandidates(organizationId: string, studentId: string, search: string) {
    await this.requireStudent(organizationId, studentId);
    const term = search.trim();
    if (term.length < 2) {
      throw new BadRequestException({
        code: 'SEARCH_TOO_SHORT',
        message: 'Enter at least 2 characters to search parent accounts',
      });
    }

    const users = await this.prisma.user.findMany({
      where: {
        organizationId,
        userRoles: { some: { role: { code: 'PARENT' } } },
        OR: [
          { email: { contains: term, mode: 'insensitive' } },
          {
            staffProfile: {
              OR: [
                { firstName: { contains: term, mode: 'insensitive' } },
                { lastName: { contains: term, mode: 'insensitive' } },
                { displayName: { contains: term, mode: 'insensitive' } },
              ],
            },
          },
        ],
      },
      select: {
        id: true,
        email: true,
        staffProfile: {
          select: { displayName: true, firstName: true, lastName: true },
        },
      },
      orderBy: { email: 'asc' },
      take: 8,
    });

    return {
      data: users.map((user) => ({
        id: user.id,
        email: user.email,
        name: this.parentDisplayName(user),
      })),
    };
  }

  async linkParent(organizationId: string, studentId: string, parentUserId: string) {
    const [student, parent] = await Promise.all([
      this.prisma.student.findFirst({ where: { id: studentId, organizationId } }),
      this.prisma.user.findFirst({
        where: { id: parentUserId, organizationId },
        include: { userRoles: { include: { role: true } } },
      }),
    ]);

    if (!student) {
      throw new NotFoundException({ code: 'STUDENT_NOT_FOUND', message: 'Student not found' });
    }
    if (!parent) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Parent user not found' });
    }

    const isParent = parent.userRoles.some((userRole) => userRole.role.code === 'PARENT');
    if (!isParent) {
      throw new BadRequestException({
        code: 'PARENT_ROLE_REQUIRED',
        message: 'The user must have the PARENT role',
      });
    }

    const link = await this.prisma.parentStudentLink.upsert({
      where: { parentUserId_studentId: { parentUserId, studentId } },
      update: {},
      create: { organizationId, parentUserId, studentId },
    });

    return { data: { id: link.id, parentUserId, studentId } };
  }

  private async requireStudent(organizationId: string, studentId: string) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, organizationId },
      select: { id: true },
    });
    if (!student) {
      throw new NotFoundException({ code: 'STUDENT_NOT_FOUND', message: 'Student not found' });
    }
    return student;
  }

  private parentDisplayName(user: {
    email: string;
    staffProfile: { displayName: string | null; firstName: string; lastName: string } | null;
  }): string {
    const profile = user.staffProfile;
    if (profile?.displayName?.trim()) {
      return profile.displayName.trim();
    }
    if (profile) {
      const name = `${profile.firstName} ${profile.lastName}`.trim();
      if (name) {
        return name;
      }
    }
    return user.email;
  }
}
