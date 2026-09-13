import { ApiProperty } from '@nestjs/swagger';

export class HealthChecksDto {
  @ApiProperty({ example: 'ok', enum: ['ok', 'error'] })
  database!: 'ok' | 'error';
}

export class HealthDataDto {
  @ApiProperty({ example: 'ok', enum: ['ok', 'degraded', 'error'] })
  status!: 'ok' | 'degraded' | 'error';

  @ApiProperty({ type: HealthChecksDto })
  checks!: HealthChecksDto;
}

export class HealthMetaDto {
  @ApiProperty({ example: '2026-09-11T00:00:00.000Z' })
  timestamp!: string;
}

export class HealthResponseDto {
  @ApiProperty({ type: HealthDataDto })
  data!: HealthDataDto;

  @ApiProperty({ type: HealthMetaDto })
  meta!: HealthMetaDto;
}
