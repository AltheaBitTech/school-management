import { ApiPropertyOptional } from '@nestjs/swagger';
import { FeePaymentMethod, StudentFeeStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsUUID, Matches } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { FEE_REPORT_DATE_PATTERN, FeeReportDateScope } from '../constants/fee-report.constants';

export class FeeReportQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: '2026-09-01' })
  @IsOptional()
  @IsDateString({ strict: false })
  @Matches(FEE_REPORT_DATE_PATTERN)
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-09-30' })
  @IsOptional()
  @IsDateString({ strict: false })
  @Matches(FEE_REPORT_DATE_PATTERN)
  endDate?: string;

  @ApiPropertyOptional({
    enum: FeeReportDateScope,
    description:
      'ASSIGNED filters by student fee assignment (createdAt). COLLECTED filters by fee payment date.',
    default: FeeReportDateScope.ASSIGNED,
  })
  @IsOptional()
  @IsEnum(FeeReportDateScope)
  dateScope?: FeeReportDateScope;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  feeStructureId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @ApiPropertyOptional({ enum: StudentFeeStatus })
  @IsOptional()
  @IsEnum(StudentFeeStatus)
  status?: StudentFeeStatus;

  @ApiPropertyOptional({ enum: FeePaymentMethod })
  @IsOptional()
  @IsEnum(FeePaymentMethod)
  paymentMethod?: FeePaymentMethod;
}
