import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Student, StudentStatus } from '@prisma/client';
import { buildPaginationMeta } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { STUDENT_ERROR_CODES } from './constants/student.constants';
import { CreateStudentDto } from './dto/create-student.dto';
import { ListStudentsQueryDto } from './dto/list-students-query.dto';
import { StudentResponseDto } from './dto/student-response.dto';
import { isValidStudentCode, normalizeStudentCode } from './utils/student-code.util';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateStudentDto): Promise<Student> {
    const normalizedCode = normalizeStudentCode(dto.studentCode);

    if (!isValidStudentCode(normalizedCode)) {
      throw new BadRequestException({
        code: STUDENT_ERROR_CODES.INVALID_STUDENT_CODE,
        message: 'Invalid student code',
      });
    }

    try {
      return await this.prisma.student.create({
        data: {
          organizationId,
          studentCode: normalizedCode,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          displayName: dto.displayName?.trim() || null,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
          className: dto.className?.trim() || null,
          status: StudentStatus.ACTIVE,
        },
      });
    } catch (error: unknown) {
      this.handleUniqueViolation(error);
      throw error;
    }
  }

  async list(organizationId: string, query: ListStudentsQueryDto) {
    const where: Prisma.StudentWhereInput = {
      organizationId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
              { displayName: { contains: query.search, mode: 'insensitive' } },
              { studentCode: { contains: query.search, mode: 'insensitive' } },
              { className: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.student.count({ where }),
    ]);

    return {
      data: items.map((item) => this.toDto(item)),
      meta: buildPaginationMeta(query.page, query.pageSize, total),
    };
  }

  async findById(organizationId: string, studentId: string): Promise<Student> {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, organizationId },
    });

    if (!student) {
      throw new NotFoundException({
        code: STUDENT_ERROR_CODES.STUDENT_NOT_FOUND,
        message: 'Student not found',
      });
    }

    return student;
  }

  async assertActiveStudent(organizationId: string, studentId: string): Promise<Student> {
    const student = await this.findById(organizationId, studentId);

    if (student.status !== StudentStatus.ACTIVE) {
      throw new BadRequestException({
        code: STUDENT_ERROR_CODES.STUDENT_INACTIVE,
        message: 'Student is not active',
      });
    }

    return student;
  }

  toDto(student: Student): StudentResponseDto {
    return {
      id: student.id,
      studentCode: student.studentCode,
      firstName: student.firstName,
      lastName: student.lastName,
      displayName: student.displayName,
      dateOfBirth: student.dateOfBirth?.toISOString().slice(0, 10) ?? null,
      className: student.className,
      status: student.status,
      createdAt: student.createdAt.toISOString(),
      updatedAt: student.updatedAt.toISOString(),
    };
  }

  private handleUniqueViolation(error: unknown): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException({
        code: STUDENT_ERROR_CODES.DUPLICATE_STUDENT_CODE,
        message: 'Student code already exists for this organization',
      });
    }
  }
}
