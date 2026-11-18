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
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentResponseDto } from './dto/student-response.dto';
import { ClassesService, ResolvedSection } from '../classes/classes.service';
import { sectionDisplayFields } from '../classes/utils/section-display.util';
import { suggestNextPrefixedCode } from '../common/utils/sequential-code.util';
import { DEFAULT_STUDENT_CODE_PREFIX } from './constants/student.constants';
import { isValidStudentCode, normalizeStudentCode } from './utils/student-code.util';
import { studentProfileFieldErrors } from './utils/student-profile.util';

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly classesService: ClassesService,
  ) {}

  async create(organizationId: string, dto: CreateStudentDto): Promise<Student> {
    const normalizedCode = normalizeStudentCode(dto.studentCode);

    if (!isValidStudentCode(normalizedCode)) {
      throw new BadRequestException({
        code: STUDENT_ERROR_CODES.INVALID_STUDENT_CODE,
        message: 'Invalid student code',
      });
    }

    const resolved = await this.resolveSection(organizationId, dto);
    const profile = this.requireProfile({
      ...dto,
      studentClass: resolved.className,
      section: resolved.name,
    });

    try {
      return await this.prisma.student.create({
        data: {
          organizationId,
          studentCode: normalizedCode,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          displayName: dto.displayName?.trim() || null,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
          sectionId: resolved.id,
          ...sectionDisplayFields(resolved.className, resolved.name),
          rollNumber: profile.rollNumber,
          guardianName: profile.guardianName,
          guardianPhone: profile.guardianPhone,
          academicYear: profile.academicYear,
          currentTerm: dto.currentTerm ?? null,
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
      ...(query.studentClass
        ? { studentClass: { equals: query.studentClass.trim(), mode: 'insensitive' } }
        : {}),
      ...(query.section
        ? { section: { equals: query.section.trim(), mode: 'insensitive' } }
        : {}),
      ...(query.sectionId ? { sectionId: query.sectionId } : {}),
      ...(query.classId ? { sectionRef: { classId: query.classId } } : {}),
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
              { displayName: { contains: query.search, mode: 'insensitive' } },
              { studentCode: { contains: query.search, mode: 'insensitive' } },
              { className: { contains: query.search, mode: 'insensitive' } },
              { studentClass: { contains: query.search, mode: 'insensitive' } },
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

  async update(organizationId: string, studentId: string, dto: UpdateStudentDto): Promise<Student> {
    const existing = await this.findById(organizationId, studentId);

    const classChanged =
      dto.sectionId !== undefined || dto.studentClass !== undefined || dto.section !== undefined;
    const resolved = classChanged
      ? await this.resolveSection(organizationId, {
          sectionId: dto.sectionId,
          studentClass: dto.studentClass ?? existing.studentClass ?? undefined,
          section: dto.section ?? existing.section ?? undefined,
        })
      : null;

    const profileTouched =
      classChanged ||
      dto.rollNumber !== undefined ||
      dto.academicYear !== undefined ||
      dto.guardianName !== undefined ||
      dto.guardianPhone !== undefined;
    const profile = profileTouched
      ? this.requireProfile({
          studentClass: resolved ? resolved.className : existing.studentClass,
          section: resolved ? resolved.name : existing.section,
          rollNumber: dto.rollNumber !== undefined ? dto.rollNumber : existing.rollNumber,
          academicYear: dto.academicYear !== undefined ? dto.academicYear : existing.academicYear,
          guardianName: dto.guardianName !== undefined ? dto.guardianName : existing.guardianName,
          guardianPhone: dto.guardianPhone !== undefined ? dto.guardianPhone : existing.guardianPhone,
        })
      : null;

    try {
      return await this.prisma.student.update({
        where: { id: studentId },
        data: {
          ...(dto.firstName !== undefined ? { firstName: dto.firstName.trim() } : {}),
          ...(dto.lastName !== undefined ? { lastName: dto.lastName.trim() } : {}),
          ...(dto.displayName !== undefined ? { displayName: dto.displayName?.trim() || null } : {}),
          ...(dto.dateOfBirth !== undefined
            ? { dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null }
            : {}),
          ...(resolved
            ? {
                sectionId: resolved.id,
                ...sectionDisplayFields(resolved.className, resolved.name),
              }
            : {}),
          ...(profile
            ? {
                rollNumber: profile.rollNumber,
                guardianName: profile.guardianName,
                guardianPhone: profile.guardianPhone,
                academicYear: profile.academicYear,
              }
            : {}),
          ...(dto.currentTerm !== undefined ? { currentTerm: dto.currentTerm } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
        },
      });
    } catch (error: unknown) {
      this.handleUniqueViolation(error);
      throw error;
    }
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
      studentClass: student.studentClass,
      section: student.section,
      sectionId: student.sectionId,
      rollNumber: student.rollNumber,
      guardianName: student.guardianName,
      guardianPhone: student.guardianPhone,
      academicYear: student.academicYear,
      currentTerm: student.currentTerm,
      userId: student.userId,
      status: student.status,
      createdAt: student.createdAt.toISOString(),
      updatedAt: student.updatedAt.toISOString(),
    };
  }

  async suggestNextStudentCode(organizationId: string): Promise<string> {
    const rows = await this.prisma.student.findMany({
      where: { organizationId },
      select: { studentCode: true },
    });

    return suggestNextPrefixedCode(
      rows.map((row) => row.studentCode),
      { prefix: DEFAULT_STUDENT_CODE_PREFIX },
    );
  }

  /**
   * Resolves the student's section from a section ID (preferred) or from class/section
   * names, which must match a section already set up under Classes & Sections.
   */
  private async resolveSection(
    organizationId: string,
    input: { sectionId?: string; studentClass?: string; section?: string },
  ): Promise<ResolvedSection> {
    if (input.sectionId) {
      return this.classesService.resolveActiveSectionById(organizationId, input.sectionId);
    }

    const studentClass = input.studentClass?.trim();
    const section = input.section?.trim();
    if (!studentClass || !section) {
      throw new BadRequestException({
        code: STUDENT_ERROR_CODES.INVALID_STUDENT_PROFILE,
        message: 'Class and section are required',
      });
    }

    const resolved = await this.classesService.findActiveSectionByNames(
      organizationId,
      studentClass,
      section,
    );
    if (!resolved) {
      throw new BadRequestException({
        code: STUDENT_ERROR_CODES.SECTION_NOT_SET_UP,
        message: `Class "${studentClass}" section "${section}" is not set up. Add it under Classes & Sections first.`,
      });
    }
    return resolved;
  }

  private requireProfile(input: {
    studentClass?: string | null;
    section?: string | null;
    rollNumber?: string | null;
    academicYear?: string | null;
    guardianName?: string | null;
    guardianPhone?: string | null;
  }) {
    const fields = {
      studentClass: input.studentClass?.trim() ?? '',
      section: input.section?.trim() ?? '',
      rollNumber: input.rollNumber?.trim() ?? '',
      academicYear: input.academicYear?.trim() ?? '',
      guardianName: input.guardianName?.trim() ?? '',
      guardianPhone: input.guardianPhone?.trim() ?? '',
    };
    const errors = studentProfileFieldErrors(fields);
    if (errors.length > 0) {
      throw new BadRequestException({
        code: STUDENT_ERROR_CODES.INVALID_STUDENT_PROFILE,
        message: errors[0]?.message ?? 'Student profile is incomplete',
      });
    }
    return fields;
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
