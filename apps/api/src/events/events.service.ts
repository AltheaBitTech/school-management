import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Event,
  EventParticipant,
  EventParticipantType,
  EventStatus,
  EventType,
  Prisma,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { buildPaginationMeta } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { EVENT_ERROR_CODES, BLOCKING_EVENT_STATUSES } from './constants/event.constants';
import {
  CreateEventDto,
  CreateEventParticipantDto,
  CreateVenueDto,
  UpdateEventDto,
  UpdateVenueDto,
} from './dto/event.dto';
import { ListEventsQueryDto, ListVenuesQueryDto } from './dto/list-events-query.dto';

const eventInclude = {
  venue: true,
  participants: {
    orderBy: { createdAt: 'asc' as const },
  },
} as const;

type EventWithRelations = Prisma.EventGetPayload<{ include: typeof eventInclude }>;

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string, query: ListEventsQueryDto) {
    const fromDate = query.fromDate ? new Date(query.fromDate) : undefined;
    const toDate = query.toDate ? new Date(query.toDate) : undefined;
    if (fromDate && toDate && toDate <= fromDate) {
      throw this.invalidDateRange();
    }

    const where: Prisma.EventWhereInput = {
      organizationId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.type
        ? { type: query.type }
        : query.activityOnly
          ? { type: { in: [EventType.WORKSHOP, EventType.COMPETITION, EventType.EXHIBITION] } }
          : {}),
      ...(query.venueId ? { venueId: query.venueId } : {}),
      ...(fromDate || toDate
        ? {
            ...(fromDate ? { endAt: { gt: fromDate } } : {}),
            ...(toDate ? { startAt: { lt: toDate } } : {}),
          }
        : {}),
    };

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        include: eventInclude,
        orderBy: { startAt: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      data: events.map((event) => this.toDto(event)),
      meta: buildPaginationMeta(query.page, query.pageSize, total),
    };
  }

  async findById(organizationId: string, eventId: string): Promise<EventWithRelations> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, organizationId },
      include: eventInclude,
    });
    if (!event) {
      throw new NotFoundException({
        code: EVENT_ERROR_CODES.EVENT_NOT_FOUND,
        message: 'Event not found',
      });
    }
    return event;
  }

  async create(
    organizationId: string,
    actor: AuthenticatedUser,
    dto: CreateEventDto,
  ): Promise<EventWithRelations> {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    this.assertDateRange(startAt, endAt);
    return this.prisma.$transaction(async (tx) => {
      await this.lockActiveVenue(tx, organizationId, dto.venueId);
      await this.assertActor(tx, organizationId, actor.userId);
      if (this.isBlockingStatus(EventStatus.DRAFT)) {
        await this.assertNoVenueConflict(tx, organizationId, dto.venueId, startAt, endAt);
      }

      const event = await tx.event.create({
        data: {
          organizationId,
          title: dto.title.trim(),
          description: dto.description?.trim() || null,
          type: dto.type,
          status: EventStatus.DRAFT,
          startAt,
          endAt,
          venueId: dto.venueId,
          createdByUserId: actor.userId,
        },
        include: eventInclude,
      });
      return event;
    });
  }

  async update(
    organizationId: string,
    eventId: string,
    dto: UpdateEventDto,
  ): Promise<EventWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      const current = await this.lockEvent(tx, organizationId, eventId);
      this.assertEditable(current.status);

      const startAt = dto.startAt ? new Date(dto.startAt) : current.startAt;
      const endAt = dto.endAt ? new Date(dto.endAt) : current.endAt;
      this.assertDateRange(startAt, endAt);
      const venueId = dto.venueId ?? current.venueId;
      await this.lockActiveVenue(tx, organizationId, venueId);
      if (this.isBlockingStatus(current.status)) {
        await this.assertNoVenueConflict(tx, organizationId, venueId, startAt, endAt, eventId);
      }

      return tx.event.update({
        where: { id: eventId },
        data: {
          ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
          ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
          ...(dto.type !== undefined ? { type: dto.type } : {}),
          ...(dto.startAt !== undefined ? { startAt } : {}),
          ...(dto.endAt !== undefined ? { endAt } : {}),
          ...(dto.venueId !== undefined ? { venueId } : {}),
        },
        include: eventInclude,
      });
    });
  }

  async cancel(organizationId: string, eventId: string): Promise<EventWithRelations> {
    return this.transition(organizationId, eventId, EventStatus.CANCELLED);
  }

  async schedule(organizationId: string, eventId: string): Promise<EventWithRelations> {
    return this.transition(organizationId, eventId, EventStatus.SCHEDULED);
  }

  async complete(organizationId: string, eventId: string): Promise<EventWithRelations> {
    return this.transition(organizationId, eventId, EventStatus.COMPLETED);
  }

  async archive(organizationId: string, eventId: string): Promise<EventWithRelations> {
    return this.transition(organizationId, eventId, EventStatus.ARCHIVED);
  }

  async listVenues(organizationId: string, query: ListVenuesQueryDto) {
    const where: Prisma.VenueWhereInput = {
      organizationId,
      ...(query.active === undefined ? {} : { active: query.active }),
    };
    const [venues, total] = await Promise.all([
      this.prisma.venue.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.venue.count({ where }),
    ]);
    return {
      data: venues.map((venue) => this.toVenueDto(venue)),
      meta: buildPaginationMeta(query.page, query.pageSize, total),
    };
  }

  async getVenue(organizationId: string, venueId: string) {
    return this.toVenueDto(await this.getVenueRecord(this.prisma, organizationId, venueId));
  }

  async createVenue(organizationId: string, dto: CreateVenueDto) {
    try {
      const venue = await this.prisma.venue.create({
        data: {
          organizationId,
          name: dto.name.trim(),
          location: dto.location?.trim() || null,
          capacity: dto.capacity ?? null,
        },
      });
      return this.toVenueDto(venue);
    } catch (error) {
      this.rethrowKnownConflict(error, 'Venue name already exists in this organization', EVENT_ERROR_CODES.DUPLICATE_VENUE);
      throw error;
    }
  }

  async updateVenue(organizationId: string, venueId: string, dto: UpdateVenueDto) {
    try {
      const venue = await this.prisma.$transaction(async (tx) => {
        await this.lockVenue(tx, organizationId, venueId);
        return tx.venue.update({
          where: { id: venueId },
          data: {
            ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
            ...(dto.location !== undefined ? { location: dto.location?.trim() || null } : {}),
            ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
            ...(dto.active !== undefined ? { active: dto.active } : {}),
          },
        });
      });
      return this.toVenueDto(venue);
    } catch (error) {
      this.rethrowKnownConflict(error, 'Venue name already exists in this organization', EVENT_ERROR_CODES.DUPLICATE_VENUE);
      throw error;
    }
  }

  async listParticipants(organizationId: string, eventId: string) {
    await this.findById(organizationId, eventId);
    const participants = await this.prisma.eventParticipant.findMany({
      where: { organizationId, eventId },
      orderBy: { createdAt: 'asc' },
    });
    return { data: participants.map((participant) => this.toParticipantDto(participant)) };
  }

  async addParticipant(
    organizationId: string,
    eventId: string,
    dto: CreateEventParticipantDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const event = await this.lockEvent(tx, organizationId, eventId);
      this.assertEditable(event.status);
      await this.assertParticipant(tx, organizationId, dto);
      try {
        const participant = await tx.eventParticipant.create({
          data: { organizationId, eventId, ...dto },
        });
        return this.toParticipantDto(participant);
      } catch (error) {
        this.rethrowKnownConflict(error, 'Participant is already assigned to this event', EVENT_ERROR_CODES.DUPLICATE_PARTICIPANT);
        throw error;
      }
    });
  }

  async removeParticipant(organizationId: string, eventId: string, participantId: string) {
    return this.prisma.$transaction(async (tx) => {
      const event = await this.lockEvent(tx, organizationId, eventId);
      this.assertEditable(event.status);
      const participant = await tx.eventParticipant.findFirst({
        where: { id: participantId, organizationId, eventId },
      });
      if (!participant) {
        throw new NotFoundException({
          code: EVENT_ERROR_CODES.PARTICIPANT_NOT_FOUND,
          message: 'Event participant not found',
        });
      }
      await tx.eventParticipant.delete({ where: { id: participant.id } });
      return { data: this.toParticipantDto(participant) };
    });
  }

  toDto(event: EventWithRelations) {
    return {
      id: event.id,
      title: event.title,
      description: event.description,
      type: event.type,
      status: event.status,
      startAt: event.startAt.toISOString(),
      endAt: event.endAt.toISOString(),
      venueId: event.venueId,
      createdByUserId: event.createdByUserId,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
      archivedAt: event.archivedAt?.toISOString() ?? null,
      cancelledAt: event.cancelledAt?.toISOString() ?? null,
      completedAt: event.completedAt?.toISOString() ?? null,
      venue: this.toVenueDto(event.venue),
      participants: event.participants.map((participant) => this.toParticipantDto(participant)),
    };
  }

  private async transition(
    organizationId: string,
    eventId: string,
    nextStatus: EventStatus,
  ): Promise<EventWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      const current = await this.lockEvent(tx, organizationId, eventId);
      this.assertTransition(current.status, nextStatus);
      const data: Prisma.EventUpdateInput = { status: nextStatus };
      if (nextStatus === EventStatus.COMPLETED) data.completedAt = new Date();
      if (nextStatus === EventStatus.CANCELLED) data.cancelledAt = new Date();
      if (nextStatus === EventStatus.ARCHIVED) data.archivedAt = new Date();
      return tx.event.update({ where: { id: eventId }, data, include: eventInclude });
    });
  }

  private async assertParticipant(
    tx: Prisma.TransactionClient,
    organizationId: string,
    dto: CreateEventParticipantDto,
  ): Promise<void> {
    if (dto.participantType === EventParticipantType.STAFF) {
      const staff = await tx.staff.findFirst({
        where: { id: dto.participantId, organizationId, employmentStatus: { not: 'OFFBOARDED' } },
        select: { id: true },
      });
      if (!staff) throw this.unauthorizedParticipant();
      return;
    }

    const student = await tx.student.findFirst({
      where: { id: dto.participantId, organizationId, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!student) throw this.unauthorizedParticipant();
  }

  private async assertActor(
    tx: Prisma.TransactionClient,
    organizationId: string,
    userId: string,
  ): Promise<void> {
    const user = await tx.user.findFirst({ where: { id: userId, organizationId, status: 'ACTIVE' } });
    if (!user) {
      throw new NotFoundException({ code: EVENT_ERROR_CODES.EVENT_NOT_FOUND, message: 'Authenticated user not found' });
    }
  }

  private async lockActiveVenue(
    tx: Prisma.TransactionClient,
    organizationId: string,
    venueId: string,
  ) {
    const venue = await this.lockVenue(tx, organizationId, venueId);
    if (!venue) {
      throw new NotFoundException({ code: EVENT_ERROR_CODES.VENUE_NOT_FOUND, message: 'Venue not found' });
    }
    if (!venue.active) {
      throw new ConflictException({ code: EVENT_ERROR_CODES.VENUE_INACTIVE, message: 'Venue is inactive' });
    }
    return venue;
  }

  private async getVenueRecord(client: PrismaService | Prisma.TransactionClient, organizationId: string, venueId: string) {
    const venue = await client.venue.findFirst({ where: { id: venueId, organizationId } });
    if (!venue) {
      throw new NotFoundException({ code: EVENT_ERROR_CODES.VENUE_NOT_FOUND, message: 'Venue not found' });
    }
    return venue;
  }

  private async lockVenue(
    tx: Prisma.TransactionClient,
    organizationId: string,
    venueId: string,
  ) {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "Venue"
      WHERE id = ${venueId}::uuid AND "organizationId" = ${organizationId}::uuid
      FOR UPDATE
    `;
    if (rows.length === 0) {
      throw new NotFoundException({ code: EVENT_ERROR_CODES.VENUE_NOT_FOUND, message: 'Venue not found' });
    }
    return tx.venue.findFirstOrThrow({ where: { id: venueId, organizationId } });
  }

  private async lockEvent(tx: Prisma.TransactionClient, organizationId: string, eventId: string): Promise<Event> {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "Event"
      WHERE id = ${eventId}::uuid AND "organizationId" = ${organizationId}::uuid
      FOR UPDATE
    `;
    if (rows.length === 0) {
      throw new NotFoundException({ code: EVENT_ERROR_CODES.EVENT_NOT_FOUND, message: 'Event not found' });
    }
    return tx.event.findFirstOrThrow({ where: { id: eventId, organizationId } });
  }

  private async assertNoVenueConflict(
    tx: Prisma.TransactionClient,
    organizationId: string,
    venueId: string,
    startAt: Date,
    endAt: Date,
    excludeEventId?: string,
  ): Promise<void> {
    const conflict = await tx.event.findFirst({
      where: {
        organizationId,
        venueId,
        status: { in: [...BLOCKING_EVENT_STATUSES] },
        ...(excludeEventId ? { id: { not: excludeEventId } } : {}),
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      select: { id: true },
    });
    if (conflict) {
      throw new ConflictException({ code: EVENT_ERROR_CODES.VENUE_CONFLICT, message: 'Venue is already booked for this time range' });
    }
  }

  private assertDateRange(startAt: Date, endAt: Date): void {
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
      throw this.invalidDateRange();
    }
  }

  private invalidDateRange(): BadRequestException {
    return new BadRequestException({ code: EVENT_ERROR_CODES.INVALID_DATE_RANGE, message: 'Event end time must be after its start time' });
  }

  private assertEditable(status: EventStatus): void {
    if (status !== EventStatus.DRAFT && status !== EventStatus.SCHEDULED) {
      throw new ConflictException({ code: EVENT_ERROR_CODES.EVENT_NOT_EDITABLE, message: 'Only draft or scheduled events may be edited' });
    }
  }

  private assertTransition(current: EventStatus, next: EventStatus): void {
    const valid =
      current === next ||
      (current === EventStatus.DRAFT &&
        ([EventStatus.SCHEDULED, EventStatus.CANCELLED] as EventStatus[]).includes(next)) ||
      (current === EventStatus.SCHEDULED &&
        ([EventStatus.COMPLETED, EventStatus.CANCELLED] as EventStatus[]).includes(next)) ||
      (current === EventStatus.COMPLETED && next === EventStatus.ARCHIVED);
    if (!valid) {
      throw new ConflictException({ code: EVENT_ERROR_CODES.INVALID_TRANSITION, message: `Cannot transition event from ${current} to ${next}` });
    }
  }

  private isBlockingStatus(status: EventStatus): boolean {
    return (BLOCKING_EVENT_STATUSES as readonly string[]).includes(status);
  }

  private unauthorizedParticipant(): BadRequestException {
    return new BadRequestException({ code: EVENT_ERROR_CODES.PARTICIPANT_NOT_AUTHORIZED, message: 'Participant does not belong to this organization or is inactive' });
  }

  private rethrowKnownConflict(error: unknown, message: string, code: string): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException({ code, message });
    }
  }

  private toVenueDto(venue: { id: string; name: string; location: string | null; capacity: number | null; active: boolean }) {
    return { id: venue.id, name: venue.name, location: venue.location, capacity: venue.capacity, active: venue.active };
  }

  private toParticipantDto(participant: EventParticipant) {
    return {
      id: participant.id,
      participantType: participant.participantType,
      participantId: participant.participantId,
      createdAt: participant.createdAt.toISOString(),
    };
  }
}
