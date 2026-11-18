import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ClassStatus, PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StudentsService } from '../students/students.service';
import { ClassesService } from './classes.service';

const describeIfDatabase = process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;

const profile = {
  rollNumber: '1',
  guardianName: 'Guardian',
  guardianPhone: '9876543210',
  academicYear: '2025-2026',
};

describeIfDatabase('Classes integration', () => {
  let prisma: PrismaClient;
  let classesService: ClassesService;
  let studentsService: StudentsService;
  let orgAId: string;
  let orgBId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();

    const orgA = await prisma.organization.create({
      data: { name: 'Class School A', code: `class-a-${Date.now()}` },
    });
    const orgB = await prisma.organization.create({
      data: { name: 'Class School B', code: `class-b-${Date.now()}` },
    });
    orgAId = orgA.id;
    orgBId = orgB.id;

    classesService = new ClassesService(prisma as unknown as PrismaService);
    studentsService = new StudentsService(prisma as unknown as PrismaService, classesService);
  });

  afterAll(async () => {
    const orgIds = [orgAId, orgBId];
    await prisma.student.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.section.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.academicUnit.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
    await prisma.$disconnect();
  });

  it('creates classes with sections and lists them in display order', async () => {
    const grade9 = await classesService.createClass(orgAId, { name: 'Grade 9', displayOrder: 9 });
    const grade8 = await classesService.createClass(orgAId, { name: 'Grade 8', displayOrder: 8 });
    await classesService.createSection(orgAId, grade8.id, { name: 'A', capacity: 40 });
    await classesService.createSection(orgAId, grade8.id, { name: 'B' });

    const list = await classesService.listClasses(orgAId, {});
    expect(list.map((item) => item.name)).toEqual(['Grade 8', 'Grade 9']);
    expect(list[0]!.sections.map((section) => section.name)).toEqual(['A', 'B']);
    expect(list[0]!.sections[0]!.capacity).toBe(40);
    expect(grade9.sections).toEqual([]);
  });

  it('rejects duplicate class and section names case-insensitively', async () => {
    const grade10 = await classesService.createClass(orgAId, { name: 'Grade 10' });
    await expect(classesService.createClass(orgAId, { name: 'grade 10' })).rejects.toBeInstanceOf(
      ConflictException,
    );

    await classesService.createSection(orgAId, grade10.id, { name: 'A' });
    await expect(
      classesService.createSection(orgAId, grade10.id, { name: 'a' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('keeps classes isolated per organization', async () => {
    const grade = await classesService.createClass(orgAId, { name: 'Grade 11' });
    await classesService.createClass(orgBId, { name: 'Grade 11' });

    await expect(classesService.getClass(orgBId, grade.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('assigns students by section and resyncs their labels on rename', async () => {
    const grade = await classesService.createClass(orgAId, { name: 'Grade 6' });
    const section = await classesService.createSection(orgAId, grade.id, { name: 'A' });

    const student = await studentsService.create(orgAId, {
      studentCode: `cls-${Date.now()}`,
      firstName: 'Asha',
      lastName: 'Rao',
      sectionId: section.id,
      ...profile,
    });
    expect(student.sectionId).toBe(section.id);
    expect(student.studentClass).toBe('Grade 6');
    expect(student.section).toBe('A');

    await classesService.updateClass(orgAId, grade.id, { name: 'Class 6' });
    await classesService.updateSection(orgAId, section.id, { name: 'Rose' });

    const reloaded = await studentsService.findById(orgAId, student.id);
    expect(reloaded.studentClass).toBe('Class 6');
    expect(reloaded.section).toBe('Rose');
    expect(reloaded.className).toBe('Class 6 - Section Rose');
  });

  it('matches legacy class and section names and rejects unknown ones', async () => {
    const grade = await classesService.createClass(orgAId, { name: 'Grade 7' });
    const section = await classesService.createSection(orgAId, grade.id, { name: 'B' });

    const student = await studentsService.create(orgAId, {
      studentCode: `legacy-${Date.now()}`,
      firstName: 'Ravi',
      lastName: 'Kumar',
      studentClass: 'grade 7',
      section: 'b',
      ...profile,
    });
    expect(student.sectionId).toBe(section.id);
    expect(student.studentClass).toBe('Grade 7');

    await expect(
      studentsService.create(orgAId, {
        studentCode: `missing-${Date.now()}`,
        firstName: 'No',
        lastName: 'Class',
        studentClass: 'Grade 99',
        section: 'Z',
        ...profile,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks deactivating a section that still has active students', async () => {
    const grade = await classesService.createClass(orgAId, { name: 'Grade 5' });
    const section = await classesService.createSection(orgAId, grade.id, { name: 'A' });
    const empty = await classesService.createSection(orgAId, grade.id, { name: 'B' });
    await studentsService.create(orgAId, {
      studentCode: `deact-${Date.now()}`,
      firstName: 'Mira',
      lastName: 'Shah',
      sectionId: section.id,
      ...profile,
    });

    await expect(classesService.deactivateSection(orgAId, section.id)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(classesService.deactivateClass(orgAId, grade.id)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    const deactivated = await classesService.deactivateSection(orgAId, empty.id);
    expect(deactivated.status).toBe(ClassStatus.INACTIVE);
    await expect(
      studentsService.create(orgAId, {
        studentCode: `inactive-${Date.now()}`,
        firstName: 'Late',
        lastName: 'Joiner',
        sectionId: empty.id,
        ...profile,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
