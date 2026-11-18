import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClassStatus, Prisma, StudentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CLASS_ERROR_CODES } from './constants/class.constants';
import {
  ClassDto,
  CreateClassDto,
  CreateSectionDto,
  ListClassesQueryDto,
  SectionDto,
  UpdateClassDto,
  UpdateSectionDto,
} from './dto/class.dto';
import { sectionDisplayFields } from './utils/section-display.util';

const sectionInclude = {
  classTeacher: { select: { id: true, firstName: true, lastName: true, displayName: true } },
  _count: { select: { students: { where: { status: StudentStatus.ACTIVE } } } },
} satisfies Prisma.SectionInclude;

type SectionWithRelations = Prisma.SectionGetPayload<{ include: typeof sectionInclude }>;
type ClassWithSections = Prisma.SchoolClassGetPayload<{
  include: { sections: { include: typeof sectionInclude } };
}>;

export type ResolvedSection = {
  id: string;
  name: string;
  classId: string;
  className: string;
};

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Classes ----------

  async listClasses(organizationId: string, query: ListClassesQueryDto): Promise<ClassDto[]> {
    const classes = await this.prisma.schoolClass.findMany({
      where: { organizationId, ...(query.status ? { status: query.status } : {}) },
      include: {
        sections: {
          where: query.status ? { status: query.status } : {},
          include: sectionInclude,
          orderBy: { name: 'asc' },
        },
      },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });

    return classes.map((item) => this.toClassDto(item));
  }

  async getClass(organizationId: string, classId: string): Promise<ClassDto> {
    const schoolClass = await this.prisma.schoolClass.findFirst({
      where: { id: classId, organizationId },
      include: { sections: { include: sectionInclude, orderBy: { name: 'asc' } } },
    });

    if (!schoolClass) {
      throw this.classNotFound();
    }

    return this.toClassDto(schoolClass);
  }

  async createClass(organizationId: string, dto: CreateClassDto): Promise<ClassDto> {
    const name = dto.name.trim();
    await this.assertClassNameAvailable(organizationId, name);

    try {
      const created = await this.prisma.schoolClass.create({
        data: { organizationId, name, displayOrder: dto.displayOrder ?? 0 },
      });
      return this.getClass(organizationId, created.id);
    } catch (error: unknown) {
      this.rethrowUnique(error, CLASS_ERROR_CODES.DUPLICATE_CLASS_NAME, 'A class with this name already exists');
      throw error;
    }
  }

  async updateClass(organizationId: string, classId: string, dto: UpdateClassDto): Promise<ClassDto> {
    const existing = await this.findClassOrThrow(organizationId, classId);
    const nextName = dto.name?.trim();
    const renamed = nextName !== undefined && nextName !== existing.name;

    if (renamed) {
      await this.assertClassNameAvailable(organizationId, nextName, classId);
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.schoolClass.update({
          where: { id: classId },
          data: {
            ...(renamed ? { name: nextName } : {}),
            ...(dto.displayOrder !== undefined ? { displayOrder: dto.displayOrder } : {}),
          },
        });

        if (renamed) {
          const sections = await tx.section.findMany({
            where: { classId },
            select: { id: true, name: true },
          });
          for (const section of sections) {
            await tx.student.updateMany({
              where: { organizationId, sectionId: section.id },
              data: sectionDisplayFields(nextName, section.name),
            });
          }
        }
      });
    } catch (error: unknown) {
      this.rethrowUnique(error, CLASS_ERROR_CODES.DUPLICATE_CLASS_NAME, 'A class with this name already exists');
      throw error;
    }

    return this.getClass(organizationId, classId);
  }

  async deactivateClass(organizationId: string, classId: string): Promise<ClassDto> {
    await this.findClassOrThrow(organizationId, classId);

    const activeStudents = await this.prisma.student.count({
      where: { organizationId, status: StudentStatus.ACTIVE, sectionRef: { classId } },
    });
    if (activeStudents > 0) {
      throw new BadRequestException({
        code: CLASS_ERROR_CODES.CLASS_HAS_ACTIVE_STUDENTS,
        message: `This class still has ${activeStudents} active student(s). Move them to another class first.`,
      });
    }

    await this.prisma.$transaction([
      this.prisma.section.updateMany({
        where: { classId, organizationId },
        data: { status: ClassStatus.INACTIVE },
      }),
      this.prisma.schoolClass.update({
        where: { id: classId },
        data: { status: ClassStatus.INACTIVE },
      }),
    ]);

    return this.getClass(organizationId, classId);
  }

  async activateClass(organizationId: string, classId: string): Promise<ClassDto> {
    await this.findClassOrThrow(organizationId, classId);
    await this.prisma.schoolClass.update({
      where: { id: classId },
      data: { status: ClassStatus.ACTIVE },
    });
    return this.getClass(organizationId, classId);
  }

  // ---------- Sections ----------

  async createSection(
    organizationId: string,
    classId: string,
    dto: CreateSectionDto,
  ): Promise<SectionDto> {
    const schoolClass = await this.findClassOrThrow(organizationId, classId);
    if (schoolClass.status !== ClassStatus.ACTIVE) {
      throw new BadRequestException({
        code: CLASS_ERROR_CODES.CLASS_INACTIVE,
        message: 'Reactivate this class before adding sections',
      });
    }

    const name = dto.name.trim();
    await this.assertSectionNameAvailable(classId, name);
    if (dto.classTeacherId) {
      await this.assertStaffInOrganization(organizationId, dto.classTeacherId);
    }

    try {
      const section = await this.prisma.section.create({
        data: {
          organizationId,
          classId,
          name,
          classTeacherId: dto.classTeacherId ?? null,
          capacity: dto.capacity ?? null,
        },
        include: sectionInclude,
      });
      return this.toSectionDto(section);
    } catch (error: unknown) {
      this.rethrowUnique(error, CLASS_ERROR_CODES.DUPLICATE_SECTION_NAME, 'This class already has a section with this name');
      throw error;
    }
  }

  async updateSection(
    organizationId: string,
    sectionId: string,
    dto: UpdateSectionDto,
  ): Promise<SectionDto> {
    const existing = await this.findSectionOrThrow(organizationId, sectionId);
    const nextName = dto.name?.trim();
    const renamed = nextName !== undefined && nextName !== existing.name;

    if (renamed) {
      await this.assertSectionNameAvailable(existing.classId, nextName, sectionId);
    }
    if (dto.classTeacherId) {
      await this.assertStaffInOrganization(organizationId, dto.classTeacherId);
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.section.update({
          where: { id: sectionId },
          data: {
            ...(renamed ? { name: nextName } : {}),
            ...(dto.classTeacherId !== undefined ? { classTeacherId: dto.classTeacherId } : {}),
            ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
          },
        });

        if (renamed) {
          await tx.student.updateMany({
            where: { organizationId, sectionId },
            data: sectionDisplayFields(existing.schoolClass.name, nextName),
          });
        }
      });
    } catch (error: unknown) {
      this.rethrowUnique(error, CLASS_ERROR_CODES.DUPLICATE_SECTION_NAME, 'This class already has a section with this name');
      throw error;
    }

    return this.getSection(organizationId, sectionId);
  }

  async deactivateSection(organizationId: string, sectionId: string): Promise<SectionDto> {
    await this.findSectionOrThrow(organizationId, sectionId);

    const activeStudents = await this.prisma.student.count({
      where: { organizationId, sectionId, status: StudentStatus.ACTIVE },
    });
    if (activeStudents > 0) {
      throw new BadRequestException({
        code: CLASS_ERROR_CODES.SECTION_HAS_ACTIVE_STUDENTS,
        message: `This section still has ${activeStudents} active student(s). Move them to another section first.`,
      });
    }

    await this.prisma.section.update({
      where: { id: sectionId },
      data: { status: ClassStatus.INACTIVE },
    });
    return this.getSection(organizationId, sectionId);
  }

  async activateSection(organizationId: string, sectionId: string): Promise<SectionDto> {
    const section = await this.findSectionOrThrow(organizationId, sectionId);
    if (section.schoolClass.status !== ClassStatus.ACTIVE) {
      throw new BadRequestException({
        code: CLASS_ERROR_CODES.CLASS_INACTIVE,
        message: 'Reactivate the class before reactivating its sections',
      });
    }
    await this.prisma.section.update({
      where: { id: sectionId },
      data: { status: ClassStatus.ACTIVE },
    });
    return this.getSection(organizationId, sectionId);
  }

  async getSection(organizationId: string, sectionId: string): Promise<SectionDto> {
    const section = await this.prisma.section.findFirst({
      where: { id: sectionId, organizationId },
      include: sectionInclude,
    });
    if (!section) {
      throw this.sectionNotFound();
    }
    return this.toSectionDto(section);
  }

  // ---------- Used by the students module ----------

  /** Loads an active section (and its active class) by ID for student assignment. */
  async resolveActiveSectionById(organizationId: string, sectionId: string): Promise<ResolvedSection> {
    const section = await this.prisma.section.findFirst({
      where: { id: sectionId, organizationId },
      include: { schoolClass: true },
    });

    if (!section) {
      throw this.sectionNotFound();
    }
    if (section.status !== ClassStatus.ACTIVE || section.schoolClass.status !== ClassStatus.ACTIVE) {
      throw new BadRequestException({
        code: CLASS_ERROR_CODES.SECTION_INACTIVE,
        message: 'The selected class or section is inactive',
      });
    }

    return {
      id: section.id,
      name: section.name,
      classId: section.classId,
      className: section.schoolClass.name,
    };
  }

  /** Case-insensitive lookup by class and section labels (used by CSV import and legacy clients). */
  async findActiveSectionByNames(
    organizationId: string,
    className: string,
    sectionName: string,
  ): Promise<ResolvedSection | null> {
    const section = await this.prisma.section.findFirst({
      where: {
        organizationId,
        status: ClassStatus.ACTIVE,
        name: { equals: sectionName.trim(), mode: 'insensitive' },
        schoolClass: {
          status: ClassStatus.ACTIVE,
          name: { equals: className.trim(), mode: 'insensitive' },
        },
      },
      include: { schoolClass: true },
    });

    return section
      ? { id: section.id, name: section.name, classId: section.classId, className: section.schoolClass.name }
      : null;
  }

  // ---------- Helpers ----------

  private async findClassOrThrow(organizationId: string, classId: string) {
    const schoolClass = await this.prisma.schoolClass.findFirst({
      where: { id: classId, organizationId },
    });
    if (!schoolClass) {
      throw this.classNotFound();
    }
    return schoolClass;
  }

  private async findSectionOrThrow(organizationId: string, sectionId: string) {
    const section = await this.prisma.section.findFirst({
      where: { id: sectionId, organizationId },
      include: { schoolClass: true },
    });
    if (!section) {
      throw this.sectionNotFound();
    }
    return section;
  }

  private async assertClassNameAvailable(organizationId: string, name: string, excludeId?: string) {
    const clash = await this.prisma.schoolClass.findFirst({
      where: {
        organizationId,
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (clash) {
      throw new ConflictException({
        code: CLASS_ERROR_CODES.DUPLICATE_CLASS_NAME,
        message: 'A class with this name already exists',
      });
    }
  }

  private async assertSectionNameAvailable(classId: string, name: string, excludeId?: string) {
    const clash = await this.prisma.section.findFirst({
      where: {
        classId,
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (clash) {
      throw new ConflictException({
        code: CLASS_ERROR_CODES.DUPLICATE_SECTION_NAME,
        message: 'This class already has a section with this name',
      });
    }
  }

  private async assertStaffInOrganization(organizationId: string, staffId: string) {
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, organizationId },
      select: { id: true },
    });
    if (!staff) {
      throw new BadRequestException({
        code: CLASS_ERROR_CODES.CLASS_TEACHER_NOT_FOUND,
        message: 'Class teacher was not found in this school',
      });
    }
  }

  private rethrowUnique(error: unknown, code: string, message: string): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException({ code, message });
    }
  }

  private classNotFound() {
    return new NotFoundException({ code: CLASS_ERROR_CODES.CLASS_NOT_FOUND, message: 'Class not found' });
  }

  private sectionNotFound() {
    return new NotFoundException({ code: CLASS_ERROR_CODES.SECTION_NOT_FOUND, message: 'Section not found' });
  }

  private toSectionDto(section: SectionWithRelations): SectionDto {
    const teacher = section.classTeacher;
    return {
      id: section.id,
      classId: section.classId,
      name: section.name,
      status: section.status,
      capacity: section.capacity,
      classTeacherId: section.classTeacherId,
      classTeacherName: teacher
        ? teacher.displayName?.trim() || `${teacher.firstName} ${teacher.lastName}`.trim()
        : null,
      studentCount: section._count.students,
      createdAt: section.createdAt.toISOString(),
      updatedAt: section.updatedAt.toISOString(),
    };
  }

  private toClassDto(schoolClass: ClassWithSections): ClassDto {
    const sections = schoolClass.sections.map((section) => this.toSectionDto(section));
    return {
      id: schoolClass.id,
      organizationId: schoolClass.organizationId,
      name: schoolClass.name,
      displayOrder: schoolClass.displayOrder,
      status: schoolClass.status,
      sections,
      studentCount: sections.reduce((sum, section) => sum + section.studentCount, 0),
      createdAt: schoolClass.createdAt.toISOString(),
      updatedAt: schoolClass.updatedAt.toISOString(),
    };
  }
}
