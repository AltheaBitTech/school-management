import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StaffImportRowResultDto {
  @ApiProperty()
  row!: number;

  @ApiProperty({ enum: ['imported', 'error'] })
  status!: 'imported' | 'error';

  @ApiPropertyOptional({ enum: ['validation', 'duplicate'] })
  category?: 'validation' | 'duplicate';

  @ApiPropertyOptional()
  column?: string;

  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  inviteUrl?: string;

  @ApiPropertyOptional()
  inviteExpiresAt?: string;

  @ApiPropertyOptional()
  emailSent?: boolean;

  @ApiPropertyOptional()
  emailError?: { code: string; message: string };

  @ApiPropertyOptional()
  employeeCode?: string;

  @ApiPropertyOptional()
  reason?: string;
}

export class StaffImportResponseDto {
  @ApiProperty()
  imported!: number;

  @ApiProperty()
  skipped!: number;

  @ApiProperty()
  duplicateCount!: number;

  @ApiProperty({ type: [StaffImportRowResultDto] })
  rows!: StaffImportRowResultDto[];
}
