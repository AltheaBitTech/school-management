import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { EventStatus } from '@prisma/client';
import { REQUIRE_PERMISSIONS_KEY } from '../common/constants/rbac.constants';
import { EventsController } from './events.controller';
import { CreateEventDto, UpdateEventDto, UpdateVenueDto } from './dto/event.dto';

describe('EventsController contracts', () => {
  it('keeps lifecycle permissions on dedicated endpoints', () => {
    expect(Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, EventsController.prototype.cancelEvent)).toEqual(['event.cancel']);
    expect(Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, EventsController.prototype.completeEvent)).toEqual(['event.complete']);
    expect(Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, EventsController.prototype.archiveEvent)).toEqual(['event.archive']);
    expect(Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, EventsController.prototype.scheduleEvent)).toEqual(['event.update']);
    expect(Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, EventsController.prototype.updateEvent)).toEqual(['event.update']);
  });

  it('rejects lifecycle status fields from generic Event DTOs', async () => {
    const payload = {
      title: 'Meeting',
      type: 'MEETING',
      startAt: '2026-10-01T10:00:00.000Z',
      endAt: '2026-10-01T11:00:00.000Z',
      venueId: '00000000-0000-0000-0000-000000000001',
      status: EventStatus.COMPLETED,
    };

    const createErrors = await validate(plainToInstance(CreateEventDto, payload), {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    const updateErrors = await validate(plainToInstance(UpdateEventDto, { status: EventStatus.CANCELLED }), {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(createErrors.some((error) => error.property === 'status')).toBe(true);
    expect(updateErrors.some((error) => error.property === 'status')).toBe(true);
  });

  it('requires a boolean Venue active value', async () => {
    const errors = await validate(plainToInstance(UpdateVenueDto, { active: 'false' }));
    expect(errors.some((error) => error.property === 'active')).toBe(true);
  });
});
