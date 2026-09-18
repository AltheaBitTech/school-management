import { ApiProperty } from '@nestjs/swagger';
import { EventParticipantType, EventStatus, EventType } from '@prisma/client';

export class EventParticipantResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: EventParticipantType })
  participantType!: EventParticipantType;

  @ApiProperty()
  participantId!: string;

  @ApiProperty()
  createdAt!: string;
}

export class VenueResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  location!: string | null;

  @ApiProperty({ nullable: true })
  capacity!: number | null;

  @ApiProperty()
  active!: boolean;
}

export class EventResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ enum: EventType })
  type!: EventType;

  @ApiProperty({ enum: EventStatus })
  status!: EventStatus;

  @ApiProperty()
  startAt!: string;

  @ApiProperty()
  endAt!: string;

  @ApiProperty()
  venueId!: string;

  @ApiProperty()
  createdByUserId!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiProperty({ nullable: true })
  archivedAt!: string | null;

  @ApiProperty({ nullable: true })
  cancelledAt!: string | null;

  @ApiProperty({ nullable: true })
  completedAt!: string | null;

  @ApiProperty({ type: VenueResponseDto })
  venue!: VenueResponseDto;

  @ApiProperty({ type: [EventParticipantResponseDto] })
  participants!: EventParticipantResponseDto[];
}
