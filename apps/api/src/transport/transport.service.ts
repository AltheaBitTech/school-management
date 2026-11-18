import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { getLocalDateString } from '../dashboard/utils/dashboard-date.util';
import { PrismaService } from '../prisma/prisma.service';
import { getStudentDisplayName } from '../students/utils/student-display.util';
import { coversDate, rangesOverlap } from './utils/transport-dates.util';

const assignmentInclude = {
  student: true,
  route: true,
  stop: true,
  vehicle: { include: { driver: true } },
} satisfies Prisma.StudentTransportAssignmentInclude;

@Injectable()
export class TransportService {
  constructor(private readonly prisma: PrismaService) {}

  async listRoutes(organizationId: string) {
    const data = await this.prisma.transportRoute.findMany({
      where: { organizationId },
      include: { stops: { orderBy: { sequence: 'asc' } } },
      orderBy: { name: 'asc' },
    });
    return { data };
  }

  async createRoute(organizationId: string, input: { name: string; code: string }) {
    try {
      const data = await this.prisma.transportRoute.create({
        data: {
          organizationId,
          name: input.name.trim(),
          code: input.code.trim().toLowerCase(),
        },
        include: { stops: true },
      });
      return data;
    } catch (error) {
      this.rethrowUnique(error, 'A route with this code already exists.');
    }
  }

  async updateRoute(organizationId: string, routeId: string, input: { name?: string; active?: boolean }) {
    await this.requireRoute(organizationId, routeId);
    return this.prisma.transportRoute.update({
      where: { id: routeId },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
      },
      include: { stops: { orderBy: { sequence: 'asc' } } },
    });
  }

  async replaceStops(
    organizationId: string,
    routeId: string,
    stops: Array<{ name: string; address?: string; pickupTime?: string }>,
  ) {
    await this.requireRoute(organizationId, routeId);
    const assigned = await this.prisma.studentTransportAssignment.count({
      where: { organizationId, routeId },
    });
    if (assigned > 0) {
      throw new BadRequestException({
        message:
          'Students are already assigned to this route. End those assignments before changing the stops.',
      });
    }
    const seen = new Set<string>();
    for (const stop of stops) {
      if (stop.pickupTime && !/^\d{2}:\d{2}$/.test(stop.pickupTime)) {
        throw new BadRequestException({ message: 'Pickup time must use HH:mm.' });
      }
      const key = stop.name.trim().toLowerCase();
      if (seen.has(key)) {
        throw new BadRequestException({ message: 'Each stop on a route needs a distinct name.' });
      }
      seen.add(key);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.transportStop.deleteMany({ where: { organizationId, routeId } });
      if (stops.length === 0) {
        return;
      }
      await tx.transportStop.createMany({
        data: stops.map((stop, index) => ({
          organizationId,
          routeId,
          name: stop.name.trim(),
          sequence: index + 1,
          address: stop.address?.trim() || null,
          pickupTime: stop.pickupTime || null,
        })),
      });
    });

    return this.prisma.transportRoute.findFirst({
      where: { id: routeId, organizationId },
      include: { stops: { orderBy: { sequence: 'asc' } } },
    });
  }

  async listVehicles(organizationId: string) {
    const data = await this.prisma.transportVehicle.findMany({
      where: { organizationId },
      include: { driver: true },
      orderBy: { registrationNumber: 'asc' },
    });
    return { data };
  }

  async createVehicle(
    organizationId: string,
    input: { registrationNumber: string; vehicleType: string; capacity: number; driverStaffId?: string },
  ) {
    if (input.capacity < 1) {
      throw new BadRequestException({ message: 'Capacity must be at least 1.' });
    }
    if (input.driverStaffId) {
      await this.requireStaff(organizationId, input.driverStaffId);
    }
    try {
      return await this.prisma.transportVehicle.create({
        data: {
          organizationId,
          registrationNumber: input.registrationNumber.trim().toUpperCase(),
          vehicleType: input.vehicleType.trim(),
          capacity: input.capacity,
          driverStaffId: input.driverStaffId || null,
        },
        include: { driver: true },
      });
    } catch (error) {
      this.rethrowUnique(error, 'A vehicle with this registration already exists.');
    }
  }

  async updateVehicle(
    organizationId: string,
    vehicleId: string,
    input: { vehicleType?: string; capacity?: number; driverStaffId?: string | null; active?: boolean },
  ) {
    await this.requireVehicle(organizationId, vehicleId);
    if (input.capacity !== undefined && input.capacity < 1) {
      throw new BadRequestException({ message: 'Capacity must be at least 1.' });
    }
    if (input.driverStaffId) {
      await this.requireStaff(organizationId, input.driverStaffId);
    }
    return this.prisma.transportVehicle.update({
      where: { id: vehicleId },
      data: {
        ...(input.vehicleType !== undefined ? { vehicleType: input.vehicleType.trim() } : {}),
        ...(input.capacity !== undefined ? { capacity: input.capacity } : {}),
        ...(input.driverStaffId !== undefined ? { driverStaffId: input.driverStaffId } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
      },
      include: { driver: true },
    });
  }

  async listAssignments(organizationId: string, filters: { studentId?: string; routeId?: string }) {
    const data = await this.prisma.studentTransportAssignment.findMany({
      where: {
        organizationId,
        ...(filters.studentId ? { studentId: filters.studentId } : {}),
        ...(filters.routeId ? { routeId: filters.routeId } : {}),
      },
      include: assignmentInclude,
      orderBy: { effectiveFrom: 'desc' },
    });
    return { data: data.map((row) => this.toAssignment(row)) };
  }

  async createAssignment(
    organizationId: string,
    input: { studentId: string; routeId: string; stopId: string; vehicleId?: string; effectiveFrom: string; effectiveTo?: string },
  ) {
    await this.assertAssignmentShape(organizationId, input);
    await this.assertNoOverlap(organizationId, input.studentId, input.effectiveFrom, input.effectiveTo ?? null);
    if (input.vehicleId) {
      await this.assertCapacity(organizationId, input.vehicleId, input.effectiveFrom);
    }
    const created = await this.prisma.studentTransportAssignment.create({
      data: {
        organizationId,
        studentId: input.studentId,
        routeId: input.routeId,
        stopId: input.stopId,
        vehicleId: input.vehicleId || null,
        effectiveFrom: new Date(`${input.effectiveFrom}T00:00:00.000Z`),
        effectiveTo: input.effectiveTo ? new Date(`${input.effectiveTo}T00:00:00.000Z`) : null,
      },
      include: assignmentInclude,
    });
    return this.toAssignment(created);
  }

  async endAssignment(organizationId: string, assignmentId: string, effectiveTo: string) {
    const existing = await this.prisma.studentTransportAssignment.findFirst({
      where: { id: assignmentId, organizationId },
    });
    if (!existing) {
      throw new NotFoundException({ message: 'Transport assignment not found' });
    }
    const from = existing.effectiveFrom.toISOString().slice(0, 10);
    if (effectiveTo < from) {
      throw new BadRequestException({ message: 'End date must be on or after the start date.' });
    }
    const updated = await this.prisma.studentTransportAssignment.update({
      where: { id: assignmentId },
      data: { effectiveTo: new Date(`${effectiveTo}T00:00:00.000Z`) },
      include: assignmentInclude,
    });
    return this.toAssignment(updated);
  }

  async currentForStudent(organizationId: string, studentId: string) {
    const today = await this.today(organizationId);
    const rows = await this.prisma.studentTransportAssignment.findMany({
      where: { organizationId, studentId },
      include: assignmentInclude,
      orderBy: { effectiveFrom: 'desc' },
    });
    const current = rows.find((row) =>
      coversDate(row.effectiveFrom.toISOString().slice(0, 10), row.effectiveTo?.toISOString().slice(0, 10) ?? null, today),
    );
    return { data: current ? this.toPublicAssignment(current) : null };
  }

  async assertParentCanView(organizationId: string, parentUserId: string, studentId: string) {
    const link = await this.prisma.parentStudentLink.findFirst({
      where: { organizationId, parentUserId, studentId },
    });
    if (!link) {
      throw new NotFoundException({ message: 'Student not found' });
    }
  }

  async reportRows(organizationId: string) {
    const today = await this.today(organizationId);
    const rows = await this.prisma.studentTransportAssignment.findMany({
      where: { organizationId },
      include: assignmentInclude,
    });
    return rows
      .filter((row) =>
        coversDate(row.effectiveFrom.toISOString().slice(0, 10), row.effectiveTo?.toISOString().slice(0, 10) ?? null, today),
      )
      .map((row) => [
        row.student.studentCode,
        getStudentDisplayName(row.student),
        row.student.studentClass ?? row.student.className ?? '',
        row.route.name,
        row.stop.name,
        row.vehicle?.registrationNumber ?? '',
      ]);
  }

  private toAssignment(row: Prisma.StudentTransportAssignmentGetPayload<{ include: typeof assignmentInclude }>) {
    return {
      id: row.id,
      studentId: row.studentId,
      studentName: getStudentDisplayName(row.student),
      studentCode: row.student.studentCode,
      routeId: row.routeId,
      routeName: row.route.name,
      stopId: row.stopId,
      stopName: row.stop.name,
      vehicleId: row.vehicleId,
      vehicleRegistration: row.vehicle?.registrationNumber ?? null,
      driverName: row.vehicle?.driver
        ? row.vehicle.driver.displayName?.trim() || `${row.vehicle.driver.firstName} ${row.vehicle.driver.lastName}`
        : null,
      effectiveFrom: row.effectiveFrom.toISOString().slice(0, 10),
      effectiveTo: row.effectiveTo?.toISOString().slice(0, 10) ?? null,
    };
  }

  private toPublicAssignment(row: Prisma.StudentTransportAssignmentGetPayload<{ include: typeof assignmentInclude }>) {
    const full = this.toAssignment(row);
    return {
      routeName: full.routeName,
      stopName: full.stopName,
      pickupTime: row.stop.pickupTime,
      vehicleRegistration: full.vehicleRegistration,
      driverName: full.driverName,
    };
  }

  private async assertAssignmentShape(
    organizationId: string,
    input: { studentId: string; routeId: string; stopId: string; vehicleId?: string; effectiveFrom: string; effectiveTo?: string },
  ) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.effectiveFrom) || (input.effectiveTo && !/^\d{4}-\d{2}-\d{2}$/.test(input.effectiveTo))) {
      throw new BadRequestException({ message: 'Dates must use YYYY-MM-DD.' });
    }
    if (input.effectiveTo && input.effectiveTo < input.effectiveFrom) {
      throw new BadRequestException({ message: 'End date must be on or after the start date.' });
    }
    const student = await this.prisma.student.findFirst({ where: { id: input.studentId, organizationId } });
    if (!student) {
      throw new NotFoundException({ message: 'Student not found' });
    }
    const stop = await this.prisma.transportStop.findFirst({ where: { id: input.stopId, organizationId } });
    if (!stop || stop.routeId !== input.routeId) {
      throw new BadRequestException({ message: 'Choose a stop on the selected route.' });
    }
    if (input.vehicleId) {
      await this.requireVehicle(organizationId, input.vehicleId);
    }
  }

  private async assertNoOverlap(organizationId: string, studentId: string, from: string, to: string | null, ignoreId?: string) {
    const existing = await this.prisma.studentTransportAssignment.findMany({
      where: { organizationId, studentId, ...(ignoreId ? { id: { not: ignoreId } } : {}) },
    });
    const clash = existing.some((row) =>
      rangesOverlap(from, to, row.effectiveFrom.toISOString().slice(0, 10), row.effectiveTo?.toISOString().slice(0, 10) ?? null),
    );
    if (clash) {
      throw new BadRequestException({ message: 'This student already has transport covering those dates.' });
    }
  }

  private async assertCapacity(organizationId: string, vehicleId: string, day: string) {
    const vehicle = await this.requireVehicle(organizationId, vehicleId);
    const rows = await this.prisma.studentTransportAssignment.findMany({
      where: { organizationId, vehicleId },
    });
    const active = rows.filter((row) =>
      coversDate(row.effectiveFrom.toISOString().slice(0, 10), row.effectiveTo?.toISOString().slice(0, 10) ?? null, day),
    ).length;
    if (active >= vehicle.capacity) {
      throw new BadRequestException({ message: 'That vehicle is already at capacity for this date.' });
    }
  }

  private async today(organizationId: string) {
    const settings = await this.prisma.organizationSettings.findUnique({
      where: { organizationId },
      select: { timezone: true },
    });
    return getLocalDateString(settings?.timezone ?? 'UTC');
  }

  private async requireRoute(organizationId: string, routeId: string) {
    const route = await this.prisma.transportRoute.findFirst({ where: { id: routeId, organizationId } });
    if (!route) throw new NotFoundException({ message: 'Route not found' });
    return route;
  }

  private async requireVehicle(organizationId: string, vehicleId: string) {
    const vehicle = await this.prisma.transportVehicle.findFirst({ where: { id: vehicleId, organizationId } });
    if (!vehicle) throw new NotFoundException({ message: 'Vehicle not found' });
    return vehicle;
  }

  private async requireStaff(organizationId: string, staffId: string) {
    const staff = await this.prisma.staff.findFirst({ where: { id: staffId, organizationId } });
    if (!staff) throw new BadRequestException({ message: 'Driver must be a staff member in this institution.' });
  }

  private rethrowUnique(error: unknown, message: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new BadRequestException({ message });
    }
    throw error;
  }
}
