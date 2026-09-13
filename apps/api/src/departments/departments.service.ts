import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Department, DepartmentStatus, Prisma } from '@prisma/client';
import { buildPaginationMeta } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { DEPARTMENT_ERROR_CODES } from './constants/department.constants';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { ListDepartmentsQueryDto } from './dto/list-departments-query.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import {
  isValidDepartmentCode,
  normalizeDepartmentCode,
} from './utils/department-code.util';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateDepartmentDto): Promise<Department> {
    const normalizedCode = normalizeDepartmentCode(dto.code);

    if (!isValidDepartmentCode(normalizedCode)) {
      throw new BadRequestException({
        code: DEPARTMENT_ERROR_CODES.INVALID_DEPARTMENT_CODE,
        message: 'Invalid department code',
      });
    }

    try {
      return await this.prisma.department.create({
        data: {
          organizationId,
          name: dto.name.trim(),
          code: normalizedCode,
          status: DepartmentStatus.ACTIVE,
        },
      });
    } catch (error: unknown) {
      this.handleUniqueViolation(error);
      throw error;
    }
  }

  async list(organizationId: string, query: ListDepartmentsQueryDto) {
    const where: Prisma.DepartmentWhereInput = {
      organizationId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.department.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.department.count({ where }),
    ]);

    return {
      data: items.map((item) => this.toDto(item)),
      meta: buildPaginationMeta(query.page, query.pageSize, total),
    };
  }

  async findById(organizationId: string, departmentId: string): Promise<Department> {
    const department = await this.prisma.department.findFirst({
      where: { id: departmentId, organizationId },
    });

    if (!department) {
      throw new NotFoundException({
        code: DEPARTMENT_ERROR_CODES.DEPARTMENT_NOT_FOUND,
        message: 'Department not found',
      });
    }

    return department;
  }

  async update(
    organizationId: string,
    departmentId: string,
    dto: UpdateDepartmentDto,
  ): Promise<Department> {
    await this.findById(organizationId, departmentId);

    return this.prisma.department.update({
      where: { id: departmentId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      },
    });
  }

  async deactivate(organizationId: string, departmentId: string): Promise<Department> {
    await this.findById(organizationId, departmentId);

    return this.prisma.department.update({
      where: { id: departmentId },
      data: { status: DepartmentStatus.INACTIVE },
    });
  }

  async assertActiveDepartment(organizationId: string, departmentId: string): Promise<Department> {
    const department = await this.findById(organizationId, departmentId);

    if (department.status !== DepartmentStatus.ACTIVE) {
      throw new BadRequestException({
        code: DEPARTMENT_ERROR_CODES.DEPARTMENT_INACTIVE,
        message: 'Department is not active',
      });
    }

    return department;
  }

  toDto(department: Department) {
    return {
      id: department.id,
      organizationId: department.organizationId,
      name: department.name,
      code: department.code,
      status: department.status,
      createdAt: department.createdAt.toISOString(),
      updatedAt: department.updatedAt.toISOString(),
    };
  }

  private handleUniqueViolation(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException({
        code: DEPARTMENT_ERROR_CODES.DUPLICATE_DEPARTMENT_CODE,
        message: 'Department code is already in use',
      });
    }
  }
}
