import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsString } from 'class-validator';

export class CalendarQueryDto {
  @ApiProperty({ example: '2026-10-01', description: 'Inclusive range start (YYYY-MM-DD)' })
  @IsString()
  @IsISO8601({ strict: true })
  startDate!: string;

  @ApiProperty({ example: '2026-10-31', description: 'Inclusive range end (YYYY-MM-DD)' })
  @IsString()
  @IsISO8601({ strict: true })
  endDate!: string;
}
