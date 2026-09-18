import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventParticipantType, EventType } from '@prisma/client';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class CreateVenueDto {
  @ApiProperty({ example: 'Main Auditorium' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ example: 'Administrative Block' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  location?: string;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000000)
  capacity?: number;
}

export class UpdateVenueDto {
  @ApiPropertyOptional({ example: 'Main Auditorium' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ example: 'Administrative Block' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  location?: string | null;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000000)
  capacity?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class CreateEventDto {
  @ApiProperty({ example: 'Annual Sports Day' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ example: 'Inter-house athletics and team events.' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @ApiProperty({ enum: EventType })
  @IsEnum(EventType)
  type!: EventType;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  startAt!: string;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  endAt!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  venueId!: string;

}

export class UpdateEventDto {
  @ApiPropertyOptional({ example: 'Annual Sports Day' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string | null;

  @ApiPropertyOptional({ enum: EventType })
  @IsOptional()
  @IsEnum(EventType)
  type?: EventType;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  endAt?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  venueId?: string;

}

export class CreateEventParticipantDto {
  @ApiProperty({ enum: EventParticipantType })
  @IsEnum(EventParticipantType)
  participantType!: EventParticipantType;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  participantId!: string;
}
