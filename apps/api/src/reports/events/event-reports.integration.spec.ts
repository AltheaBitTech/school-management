import { EventStatus, EventType, PrismaClient } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EventReportsService } from './event-reports.service';

const describeIfDatabase = process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;

describeIfDatabase('Event reports integration', () => {
  let prisma: PrismaClient;
  let reportsService: EventReportsService;
  let orgAId: string;
  let orgBId: string;
  let venueAId: string;
  let venueBId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();

    const [orgA, orgB] = await Promise.all([
      prisma.organization.create({ data: { name: 'Report School A', code: `event-report-a-${Date.now()}` } }),
      prisma.organization.create({ data: { name: 'Report School B', code: `event-report-b-${Date.now()}` } }),
    ]);
    orgAId = orgA.id;
    orgBId = orgB.id;

    await prisma.organizationSettings.update({
      where: { organizationId: orgAId },
      data: { timezone: 'Asia/Kolkata' },
    }).catch(async () => {
      await prisma.organizationSettings.create({ data: { organizationId: orgAId, timezone: 'Asia/Kolkata' } });
    });

    const [venueA, venueB] = await Promise.all([
      prisma.venue.create({ data: { organizationId: orgAId, name: 'Report Hall A' } }),
      prisma.venue.create({ data: { organizationId: orgBId, name: 'Report Hall B' } }),
    ]);
    venueAId = venueA.id;
    venueBId = venueB.id;
    reportsService = new EventReportsService(prisma as unknown as PrismaService);
  });

  afterAll(async () => {
    await prisma.event.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.venue.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.user.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.organizationSettings.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
    await prisma.$disconnect();
  });

  it('filters tenant events by local date, type, status, venue, and pagination', async () => {
    const creatorA = await prisma.user.create({ data: { organizationId: orgAId, email: `report-a-${Date.now()}@example.com` } });
    const creatorB = await prisma.user.create({ data: { organizationId: orgBId, email: `report-b-${Date.now()}@example.com` } });
    await prisma.event.createMany({
      data: [
        {
          organizationId: orgAId,
          title: 'Local midnight event',
          type: EventType.MEETING,
          status: EventStatus.SCHEDULED,
          startAt: new Date('2026-09-17T18:45:00.000Z'),
          endAt: new Date('2026-09-17T19:45:00.000Z'),
          venueId: venueAId,
          createdByUserId: creatorA.id,
        },
        {
          organizationId: orgAId,
          title: 'Late local event',
          type: EventType.SPORTS_DAY,
          status: EventStatus.COMPLETED,
          startAt: new Date('2026-09-18T18:00:00.000Z'),
          endAt: new Date('2026-09-18T19:00:00.000Z'),
          venueId: venueAId,
          createdByUserId: creatorA.id,
        },
        {
          organizationId: orgAId,
          title: 'Archived event',
          type: EventType.MEETING,
          status: EventStatus.ARCHIVED,
          startAt: new Date('2026-09-20T10:00:00.000Z'),
          endAt: new Date('2026-09-20T11:00:00.000Z'),
          venueId: venueAId,
          createdByUserId: creatorA.id,
        },
        {
          organizationId: orgBId,
          title: 'Other tenant event',
          type: EventType.MEETING,
          status: EventStatus.SCHEDULED,
          startAt: new Date('2026-09-18T10:00:00.000Z'),
          endAt: new Date('2026-09-18T11:00:00.000Z'),
          venueId: venueBId,
          createdByUserId: creatorB.id,
        },
      ],
    });

    const localDay = await reportsService.generate(orgAId, {
      fromDate: '2026-09-18',
      toDate: '2026-09-18',
      page: 1,
      pageSize: 1,
    });
    expect(localDay.meta.total).toBe(2);
    expect(localDay.data).toHaveLength(1);
    expect(localDay.summary.byStatus).toEqual({ SCHEDULED: 1, COMPLETED: 1 });

    const filtered = await reportsService.generate(orgAId, {
      type: EventType.SPORTS_DAY,
      status: EventStatus.COMPLETED,
      venueId: venueAId,
      page: 1,
      pageSize: 100,
    });
    expect(filtered.meta.total).toBe(1);
    expect(filtered.data[0]?.title).toBe('Late local event');

    const empty = await reportsService.generate(orgAId, {
      fromDate: '2026-09-21',
      toDate: '2026-09-21',
      page: 1,
      pageSize: 100,
    });
    expect(empty.data).toEqual([]);
    expect(empty.meta.total).toBe(0);
    expect(empty.summary.total).toBe(0);
  });
});
