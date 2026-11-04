import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmploymentStatus, Prisma, Staff } from '@prisma/client';
import { normalizeEmail } from '../auth/utils/email.util';
import { buildPaginationMeta } from '../common/dto/pagination-query.dto';
import { DepartmentsService } from '../departments/departments.service';
import { PrismaService } from '../prisma/prisma.service';
import { STAFF_ERROR_CODES } from './constants/staff.constants';
import { CreateStaffDto } from './dto/create-staff.dto';
import { ListStaffQueryDto } from './dto/list-staff-query.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { suggestNextPrefixedCode } from '../common/utils/sequential-code.util';
import { DEFAULT_EMPLOYEE_CODE_PREFIX } from './constants/staff.constants';
import { isValidEmployeeCode, normalizeEmployeeCode } from './utils/employee-code.util';

type StaffWithDepartment = Staff & {
  department: { id: string; name: string; code: string } | null;
};

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly departmentsService: DepartmentsService,
  ) {}

  async create(organizationId: string, dto: CreateStaffDto): Promise<StaffWithDepartment> {
    const normalizedCode = normalizeEmployeeCode(dto.employeeCode);

    if (!isValidEmployeeCode(normalizedCode)) {
      throw new BadRequestException({
        code: STAFF_ERROR_CODES.INVALID_EMPLOYEE_CODE,
        message: 'Invalid employee code',
      });
    }

    if (dto.departmentId) {
      await this.departmentsService.assertActiveDepartment(organizationId, dto.departmentId);
    }

    if (dto.userId) {
      await this.assertUserInOrganization(organizationId, dto.userId);
      await this.assertUserNotLinked(dto.userId);
    }

    if (dto.reportingManagerId) {
      await this.assertReportingManager(organizationId, dto.reportingManagerId);
    }

    try {
      return await this.prisma.staff.create({
        data: {
          organizationId,
          employeeCode: normalizedCode,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          displayName: dto.displayName?.trim() || null,
          mobile: dto.mobile?.trim() || null,
          email: dto.email ? normalizeEmail(dto.email) : null,
          departmentId: dto.departmentId ?? null,
          designation: dto.designation?.trim() || null,
          joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : null,
          userId: dto.userId ?? null,
          reportingManagerId: dto.reportingManagerId ?? null,
          employmentStatus: EmploymentStatus.ACTIVE,
        },
        include: {
          department: {
            select: { id: true, name: true, code: true },
          },
        },
      });
    } catch (error: unknown) {
      this.handleUniqueViolation(error);
      throw error;
    }
  }

  async list(organizationId: string, query: ListStaffQueryDto) {
    const where: Prisma.StaffWhereInput = {
      organizationId,
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      ...(query.employmentStatus ? { employmentStatus: query.employmentStatus } : {}),
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
              { displayName: { contains: query.search, mode: 'insensitive' } },
              { employeeCode: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.staff.findMany({
        where,
        include: {
          department: {
            select: { id: true, name: true, code: true },
          },
        },
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.staff.count({ where }),
    ]);

    return {
      data: items.map((item) => this.toDto(item)),
      meta: buildPaginationMeta(query.page, query.pageSize, total),
    };
  }

  async findById(organizationId: string, staffId: string): Promise<StaffWithDepartment> {
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, organizationId },
      include: {
        department: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    if (!staff) {
      throw new NotFoundException({
        code: STAFF_ERROR_CODES.STAFF_NOT_FOUND,
        message: 'Staff member not found',
      });
    }

    return staff;
  }

  async resolveLoginRole(
    organizationId: string,
    userId: string | null | undefined,
  ): Promise<{ id: string; code: string; name: string } | null> {
    if (!userId) {
      return null;
    }

    const assignment = await this.prisma.userRole.findFirst({
      where: {
        userId,
        role: { organizationId },
      },
      include: {
        role: {
          select: { id: true, code: true, name: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return assignment?.role ?? null;
  }

  async resolveLoginRoles(
    organizationId: string,
    userId: string | null | undefined,
  ): Promise<Array<{ id: string; code: string; name: string }>> {
    if (!userId) {
      return [];
    }

    const assignments = await this.prisma.userRole.findMany({
      where: {
        userId,
        role: { organizationId },
      },
      include: {
        role: {
          select: { id: true, code: true, name: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return assignments.map((assignment) => assignment.role);
  }

  async toDtoWithLoginRole(
    staff: StaffWithDepartment,
    organizationId: string,
  ): Promise<
    ReturnType<StaffService['toDto']> & {
      loginRole: { id: string; code: string; name: string } | null;
      loginRoles: Array<{ id: string; code: string; name: string }>;
    }
  > {
    const loginRoles = await this.resolveLoginRoles(organizationId, staff.userId);
    return {
      ...this.toDto(staff),
      loginRole: loginRoles[0] ?? null,
      loginRoles,
    };
  }

  async update(
    organizationId: string,
    staffId: string,
    dto: UpdateStaffDto,
  ): Promise<StaffWithDepartment> {
    const existing = await this.findById(organizationId, staffId);

    if (dto.departmentId) {
      await this.departmentsService.assertActiveDepartment(organizationId, dto.departmentId);
    }

    if (dto.userId) {
      await this.assertUserInOrganization(organizationId, dto.userId);
      if (dto.userId !== existing.userId) {
        await this.assertUserNotLinked(dto.userId, staffId);
      }
    }

    if (dto.reportingManagerId) {
      if (dto.reportingManagerId === staffId) {
        throw new BadRequestException({
          code: STAFF_ERROR_CODES.INVALID_REPORTING_MANAGER,
          message: 'A staff member cannot report to themselves',
        });
      }
      await this.assertReportingManager(organizationId, dto.reportingManagerId);
    }

    return this.prisma.staff.update({
      where: { id: staffId },
      data: {
        ...(dto.firstName !== undefined ? { firstName: dto.firstName.trim() } : {}),
        ...(dto.lastName !== undefined ? { lastName: dto.lastName.trim() } : {}),
        ...(dto.displayName !== undefined
          ? { displayName: dto.displayName?.trim() || null }
          : {}),
        ...(dto.mobile !== undefined ? { mobile: dto.mobile?.trim() || null } : {}),
        ...(dto.email !== undefined
          ? { email: dto.email ? normalizeEmail(dto.email) : null }
          : {}),
        ...(dto.departmentId !== undefined ? { departmentId: dto.departmentId } : {}),
        ...(dto.designation !== undefined
          ? { designation: dto.designation?.trim() || null }
          : {}),
        ...(dto.joiningDate !== undefined
          ? { joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : null }
          : {}),
        ...(dto.userId !== undefined ? { userId: dto.userId } : {}),
        ...(dto.reportingManagerId !== undefined
          ? { reportingManagerId: dto.reportingManagerId }
          : {}),
        ...(dto.employmentStatus !== undefined
          ? { employmentStatus: dto.employmentStatus }
          : {}),
      },
      include: {
        department: {
          select: { id: true, name: true, code: true },
        },
      },
    });
  }

  async deactivate(organizationId: string, staffId: string): Promise<StaffWithDepartment> {
    const existing = await this.findById(organizationId, staffId);

    if (existing.employmentStatus === EmploymentStatus.OFFBOARDED) {
      throw new BadRequestException({
        code: STAFF_ERROR_CODES.STAFF_ALREADY_OFFBOARDED,
        message: 'Staff member is already offboarded',
      });
    }

    return this.prisma.staff.update({
      where: { id: staffId },
      data: {
        employmentStatus: EmploymentStatus.OFFBOARDED,
        lastWorkingDate: new Date(),
      },
      include: {
        department: {
          select: { id: true, name: true, code: true },
        },
      },
    });
  }

  toDto(staff: StaffWithDepartment) {
    return {
      id: staff.id,
      organizationId: staff.organizationId,
      employeeCode: staff.employeeCode,
      userId: staff.userId,
      firstName: staff.firstName,
      lastName: staff.lastName,
      displayName: staff.displayName,
      mobile: staff.mobile,
      email: staff.email,
      departmentId: staff.departmentId,
      designation: staff.designation,
      joiningDate: staff.joiningDate?.toISOString() ?? null,
      lastWorkingDate: staff.lastWorkingDate?.toISOString() ?? null,
      reportingManagerId: staff.reportingManagerId,
      employmentStatus: staff.employmentStatus,
      department: staff.department,
      createdAt: staff.createdAt.toISOString(),
      updatedAt: staff.updatedAt.toISOString(),
    };
  }

  private async assertUserInOrganization(
    organizationId: string,
    userId: string,
  ): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId },
    });

    if (!user) {
      throw new BadRequestException({
        code: STAFF_ERROR_CODES.INVALID_USER,
        message: 'User does not belong to this organization',
      });
    }
  }

  private async assertUserNotLinked(userId: string, excludeStaffId?: string): Promise<void> {
    const linkedStaff = await this.prisma.staff.findFirst({
      where: {
        userId,
        ...(excludeStaffId ? { id: { not: excludeStaffId } } : {}),
      },
    });

    if (linkedStaff) {
      throw new ConflictException({
        code: STAFF_ERROR_CODES.USER_ALREADY_LINKED,
        message: 'User is already linked to another staff profile',
      });
    }
  }

  private async assertReportingManager(
    organizationId: string,
    reportingManagerId: string,
  ): Promise<void> {
    const manager = await this.prisma.staff.findFirst({
      where: { id: reportingManagerId, organizationId },
    });

    if (!manager) {
      throw new BadRequestException({
        code: STAFF_ERROR_CODES.INVALID_REPORTING_MANAGER,
        message: 'Reporting manager does not belong to this organization',
      });
    }
  }

  async suggestNextEmployeeCode(organizationId: string): Promise<string> {
    const rows = await this.prisma.staff.findMany({
      where: { organizationId },
      select: { employeeCode: true },
    });

    return suggestNextPrefixedCode(
      rows.map((row) => row.employeeCode),
      { prefix: DEFAULT_EMPLOYEE_CODE_PREFIX },
    );
  }

  private handleUniqueViolation(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException({
        code: STAFF_ERROR_CODES.DUPLICATE_EMPLOYEE_CODE,
        message: 'Employee code is already in use',
      });
    }
  }
}
