import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  EventStatus,
  EventType,
  EventParticipantType,
  PrismaClient,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SYSTEM_PERMISSIONS } from '../permissions/constants/system-permissions';
import { EventsService } from './events.service';

const describeIfDatabase = process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;

describeIfDatabase('Events integration', () => {
  let prisma: PrismaClient;
  let eventsService: EventsService;
  let orgAId: string;
  let orgBId: string;
  let userAId: string;
  let venueAId: string;
  let venueA2Id: string;
  let venueBId: string;
  let staffAId: string;
  let staffBId: string;
  let studentAId: string;

  const actorA = {
    userId: '',
    organizationId: '',
    sessionId: 'event-session-a',
    email: 'event-admin-a@example.com',
  };

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
    for (const permission of SYSTEM_PERMISSIONS) {
      await prisma.permission.upsert({ where: { code: permission.code }, update: permission, create: permission });
    }

    const orgA = await prisma.organization.create({ data: { name: 'Event School A', code: `event-a-${Date.now()}` } });
    const orgB = await prisma.organization.create({ data: { name: 'Event School B', code: `event-b-${Date.now()}` } });
    orgAId = orgA.id;
    orgBId = orgB.id;

    const userA = await prisma.user.create({ data: { organizationId: orgAId, email: `event-a-${Date.now()}@example.com` } });
    userAId = userA.id;
    actorA.userId = userAId;
    actorA.organizationId = orgAId;

    const venueA = await prisma.venue.create({ data: { organizationId: orgAId, name: 'Event Hall A', capacity: 100 } });
    const venueA2 = await prisma.venue.create({ data: { organizationId: orgAId, name: 'Event Hall A2', capacity: 100 } });
    const venueB = await prisma.venue.create({ data: { organizationId: orgBId, name: 'Event Hall B', capacity: 100 } });
    venueAId = venueA.id;
    venueA2Id = venueA2.id;
    venueBId = venueB.id;

    const staffA = await prisma.staff.create({ data: { organizationId: orgAId, employeeCode: 'event-staff-a', firstName: 'Event', lastName: 'Staff A' } });
    const staffB = await prisma.staff.create({ data: { organizationId: orgBId, employeeCode: 'event-staff-b', firstName: 'Event', lastName: 'Staff B' } });
    staffAId = staffA.id;
    staffBId = staffB.id;
    const studentA = await prisma.student.create({ data: { organizationId: orgAId, studentCode: 'event-student-a', firstName: 'Event', lastName: 'Student A' } });
    studentAId = studentA.id;

    eventsService = new EventsService(prisma as unknown as PrismaService);
  });

  afterAll(async () => {
    await prisma.eventParticipant.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.event.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.venue.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.student.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.staff.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.user.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
    await prisma.$disconnect();
  });

  it('creates, lists, reads, and updates an event within its tenant', async () => {
    const event = await eventsService.create(orgAId, actorA, {
      title: 'Staff meeting',
      description: 'Quarterly planning',
      type: EventType.MEETING,
      startAt: '2026-10-01T10:00:00.000Z',
      endAt: '2026-10-01T11:00:00.000Z',
      venueId: venueAId,
    });

    expect(event.organizationId).toBe(orgAId);
    expect(event.status).toBe(EventStatus.DRAFT);
    expect((await eventsService.list(orgAId, { page: 1, pageSize: 10 })).data).toHaveLength(1);
    expect((await eventsService.findById(orgAId, event.id)).id).toBe(event.id);

    const updated = await eventsService.update(orgAId, event.id, { title: 'Updated staff meeting' });
    expect(updated.title).toBe('Updated staff meeting');
  });

  it('rejects cross-tenant venue and resource access', async () => {
    await expect(eventsService.create(orgAId, actorA, {
      title: 'Wrong venue', type: EventType.MEETING, startAt: '2026-11-01T10:00:00.000Z', endAt: '2026-11-01T11:00:00.000Z', venueId: venueBId,
    })).rejects.toBeInstanceOf(NotFoundException);

    await expect(eventsService.findById(orgBId, '00000000-0000-0000-0000-000000000000')).rejects.toBeInstanceOf(NotFoundException);
    await expect(eventsService.addParticipant(orgAId, '00000000-0000-0000-0000-000000000000', { participantType: EventParticipantType.STAFF, participantId: staffBId })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects overlapping bookings and allows cancelled events to release a venue', async () => {
    const first = await eventsService.create(orgAId, actorA, {
      title: 'First booking', type: EventType.SPORTS_DAY, startAt: '2026-12-01T10:00:00.000Z', endAt: '2026-12-01T12:00:00.000Z', venueId: venueAId,
    });
    await expect(eventsService.create(orgAId, actorA, {
      title: 'Overlapping booking', type: EventType.PTM, startAt: '2026-12-01T11:00:00.000Z', endAt: '2026-12-01T13:00:00.000Z', venueId: venueAId,
    })).rejects.toBeInstanceOf(ConflictException);

    await eventsService.cancel(orgAId, first.id);
    const replacement = await eventsService.create(orgAId, actorA, {
      title: 'Replacement booking', type: EventType.PTM, startAt: '2026-12-01T11:00:00.000Z', endAt: '2026-12-01T13:00:00.000Z', venueId: venueAId,
    });
    expect(replacement.status).toBe(EventStatus.DRAFT);
  });

  it('rejects booking an inactive Venue after locking and re-reading it', async () => {
    const inactiveVenue = await prisma.venue.create({
      data: { organizationId: orgAId, name: 'Inactive Hall', active: false },
    });

    await expect(eventsService.create(orgAId, actorA, {
      title: 'Inactive venue event',
      type: EventType.MEETING,
      startAt: '2027-06-01T10:00:00.000Z',
      endAt: '2027-06-01T11:00:00.000Z',
      venueId: inactiveVenue.id,
    })).rejects.toMatchObject({ response: { code: 'VENUE_INACTIVE' } });
  });

  it('protects update-time and concurrent venue bookings', async () => {
    const booked = await eventsService.create(orgAId, actorA, {
      title: 'Booked venue', type: EventType.MEETING, startAt: '2028-01-01T10:00:00.000Z', endAt: '2028-01-01T12:00:00.000Z', venueId: venueAId,
    });
    const movable = await eventsService.create(orgAId, actorA, {
      title: 'Movable event', type: EventType.MEETING, startAt: '2028-01-01T13:00:00.000Z', endAt: '2028-01-01T14:00:00.000Z', venueId: venueA2Id,
    });
    await expect(eventsService.update(orgAId, movable.id, { venueId: venueAId, startAt: '2028-01-01T11:00:00.000Z', endAt: '2028-01-01T13:00:00.000Z' })).rejects.toBeInstanceOf(ConflictException);

    const results = await Promise.allSettled([
      eventsService.create(orgAId, actorA, { title: 'Concurrent A', type: EventType.MEETING, startAt: '2028-02-01T10:00:00.000Z', endAt: '2028-02-01T11:00:00.000Z', venueId: venueAId }),
      eventsService.create(orgAId, actorA, { title: 'Concurrent B', type: EventType.MEETING, startAt: '2028-02-01T10:30:00.000Z', endAt: '2028-02-01T11:30:00.000Z', venueId: venueAId }),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(booked.venueId).toBe(venueAId);
  });

  it('validates participants and enforces lifecycle transitions', async () => {
    const event = await eventsService.create(orgAId, actorA, {
      title: 'Parent teacher meeting', type: EventType.PTM, startAt: '2027-01-01T10:00:00.000Z', endAt: '2027-01-01T11:00:00.000Z', venueId: venueAId,
    });
    const participant = await eventsService.addParticipant(orgAId, event.id, { participantType: EventParticipantType.STAFF, participantId: staffAId });
    expect(participant.participantId).toBe(staffAId);
    await expect(eventsService.addParticipant(orgAId, event.id, { participantType: EventParticipantType.STAFF, participantId: staffAId })).rejects.toBeInstanceOf(ConflictException);
    await expect(eventsService.addParticipant(orgAId, event.id, { participantType: EventParticipantType.STAFF, participantId: staffBId })).rejects.toBeInstanceOf(Error);
    const studentParticipant = await eventsService.addParticipant(orgAId, event.id, { participantType: EventParticipantType.STUDENT, participantId: studentAId });
    expect(studentParticipant.participantType).toBe(EventParticipantType.STUDENT);

    const scheduled = await eventsService.schedule(orgAId, event.id);
    expect(scheduled.status).toBe(EventStatus.SCHEDULED);
    const completed = await eventsService.complete(orgAId, event.id);
    expect(completed.status).toBe(EventStatus.COMPLETED);
    const archived = await eventsService.archive(orgAId, event.id);
    expect(archived.status).toBe(EventStatus.ARCHIVED);
    await expect(eventsService.cancel(orgAId, event.id)).rejects.toBeInstanceOf(ConflictException);
  });
});
