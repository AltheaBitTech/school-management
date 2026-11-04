import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StudentImportRowResultDto {
  @ApiProperty()
  row!: number;

  @ApiProperty({ enum: ['imported', 'error'] })
  status!: 'imported' | 'error';

  @ApiPropertyOptional({ enum: ['validation', 'duplicate'] })
  category?: 'validation' | 'duplicate';

  @ApiPropertyOptional()
  column?: string;

  @ApiPropertyOptional()
  studentCode?: string;

  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional()
  reason?: string;
}

export class StudentImportResponseDto {
  @ApiProperty()
  imported!: number;

  @ApiProperty()
  skipped!: number;

  @ApiProperty()
  duplicateCount!: number;

  @ApiProperty({ type: [StudentImportRowResultDto] })
  rows!: StudentImportRowResultDto[];
}
