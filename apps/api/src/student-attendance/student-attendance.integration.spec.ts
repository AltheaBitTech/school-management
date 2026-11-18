import { ForbiddenException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StudentAttendanceActor, StudentAttendanceService } from './student-attendance.service';

const describeIfDatabase = process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;

describeIfDatabase('Student attendance integration', () => {
  let prisma: PrismaClient;
  let service: StudentAttendanceService;
  let orgId: string;
  let sectionId: string;
  let studentIds: string[];
  let classTeacher: StudentAttendanceActor;
  let otherTeacher: StudentAttendanceActor;
  let otherStaffId: string;
  let admin: StudentAttendanceActor;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC' }).format(new Date());
  const teacherPermissions = ['student.attendance.view', 'student.attendance.mark'];

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
    service = new StudentAttendanceService(prisma as unknown as PrismaService);

    const suffix = Date.now();
    const org = await prisma.organization.create({
      data: { name: 'Student Attendance School', code: `satt-${suffix}` },
    });
    orgId = org.id;

    const [userTeacher, userOther, userAdmin] = await Promise.all(
      ['teacher', 'other', 'admin'].map((name) =>
        prisma.user.create({ data: { organizationId: orgId, email: `${name}-${suffix}@example.com` } }),
      ),
    );
    const teacherStaff = await prisma.staff.create({
      data: { organizationId: orgId, employeeCode: 'satt-1', firstName: 'Class', lastName: 'Teacher', userId: userTeacher.id },
    });
    const otherStaff = await prisma.staff.create({
      data: { organizationId: orgId, employeeCode: 'satt-2', firstName: 'Other', lastName: 'Teacher', userId: userOther.id },
    });
    otherStaffId = otherStaff.id;

    const unit = await prisma.academicUnit.create({ data: { organizationId: orgId, name: 'Grade 1' } });
    const section = await prisma.section.create({
      data: { organizationId: orgId, classId: unit.id, name: 'A', classTeacherId: teacherStaff.id },
    });
    sectionId = section.id;

    const students = await Promise.all(
      [1, 2].map((n) =>
        prisma.student.create({
          data: { organizationId: orgId, studentCode: `satt-s${n}`, firstName: `Kid${n}`, lastName: 'One', sectionId, rollNumber: String(n) },
        }),
      ),
    );
    studentIds = students.map((s) => s.id);

    classTeacher = { userId: userTeacher.id, organizationId: orgId, permissions: teacherPermissions };
    otherTeacher = { userId: userOther.id, organizationId: orgId, permissions: teacherPermissions };
    admin = {
      userId: userAdmin.id,
      organizationId: orgId,
      permissions: ['student.attendance.view', 'student.attendance.mark', 'student.attendance.manage'],
    };
  });

  afterAll(async () => {
    await prisma.studentAttendance.deleteMany({ where: { organizationId: orgId } });
    await prisma.sectionAttendanceSubstitute.deleteMany({ where: { organizationId: orgId } });
    await prisma.student.deleteMany({ where: { organizationId: orgId } });
    await prisma.section.deleteMany({ where: { organizationId: orgId } });
    await prisma.academicUnit.deleteMany({ where: { organizationId: orgId } });
    await prisma.staff.deleteMany({ where: { organizationId: orgId } });
    await prisma.user.deleteMany({ where: { organizationId: orgId } });
    await prisma.organization.delete({ where: { id: orgId } });
    await prisma.$disconnect();
  });

  it('lets the class teacher save the whole section and re-save it', async () => {
    const saved = await service.saveSectionAttendance(classTeacher, sectionId, {
      attendanceDate: today,
      entries: [
        { studentId: studentIds[0], status: 'PRESENT' },
        { studentId: studentIds[1], status: 'ABSENT' },
      ],
    });
    expect(saved.students.map((s) => s.attendance?.status)).toEqual(['PRESENT', 'ABSENT']);

    const resaved = await service.saveSectionAttendance(classTeacher, sectionId, {
      attendanceDate: today,
      entries: [{ studentId: studentIds[1], status: 'HALF_DAY' }],
    });
    expect(resaved.students[1].attendance?.status).toBe('HALF_DAY');
  });

  it('only lets another teacher in while a substitute assignment is active', async () => {
    await expect(service.getSectionAttendance(otherTeacher, sectionId, today)).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    const substitute = await service.createSubstitute(admin, sectionId, {
      staffId: otherStaffId,
      fromDate: today,
      toDate: today,
    });

    const mine = await service.listMySections(otherTeacher, today);
    expect(mine.sections).toEqual([expect.objectContaining({ id: sectionId, role: 'SUBSTITUTE', substituteUntil: today })]);

    const saved = await service.saveSectionAttendance(otherTeacher, sectionId, {
      attendanceDate: today,
      entries: [{ studentId: studentIds[0], status: 'ON_LEAVE' }],
    });
    expect(saved.section.role).toBe('SUBSTITUTE');

    await service.revokeSubstitute(orgId, substitute.id);
    await expect(service.getSectionAttendance(otherTeacher, sectionId, today)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
