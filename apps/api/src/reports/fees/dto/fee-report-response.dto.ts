import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FeePaymentMethod, StudentFeeStatus } from '@prisma/client';
import { FeeReportDateScope } from '../constants/fee-report.constants';

export class FeeReportSummaryDto {
  @ApiProperty({ enum: FeeReportDateScope })
  dateScope!: FeeReportDateScope;

  @ApiPropertyOptional({ nullable: true })
  fromDate!: string | null;

  @ApiPropertyOptional({ nullable: true })
  toDate!: string | null;

  @ApiProperty()
  timezone!: string;

  @ApiProperty()
  dateFilterApplied!: boolean;

  @ApiProperty()
  totalAssigned!: number;

  @ApiProperty()
  totalCollected!: number;

  @ApiProperty()
  totalOutstanding!: number;

  @ApiProperty()
  pendingAmount!: number;

  @ApiProperty()
  partiallyPaidAmount!: number;

  @ApiProperty()
  paidAmount!: number;

  @ApiProperty()
  assignedFeeCount!: number;

  @ApiProperty()
  pendingFeeCount!: number;

  @ApiProperty()
  partiallyPaidFeeCount!: number;

  @ApiProperty()
  paidFeeCount!: number;

  @ApiProperty()
  totalPayments!: number;
}

export class FeeReportPaymentMethodRowDto {
  @ApiProperty({ enum: FeePaymentMethod })
  method!: FeePaymentMethod;

  @ApiProperty()
  paymentCount!: number;

  @ApiProperty()
  collectedAmount!: number;
}

export class FeeReportStructureRowDto {
  @ApiProperty()
  feeStructureId!: string;

  @ApiProperty()
  feeStructureName!: string;

  @ApiProperty()
  assignedAmount!: number;

  @ApiProperty()
  collectedAmount!: number;

  @ApiProperty()
  outstandingAmount!: number;

  @ApiProperty()
  feeCount!: number;
}

export class FeeReportStatusRowDto {
  @ApiProperty({ enum: StudentFeeStatus })
  status!: StudentFeeStatus;

  @ApiProperty()
  feeCount!: number;

  @ApiProperty()
  assignedAmount!: number;

  @ApiProperty()
  outstandingAmount!: number;
}

export class FeeReportRecordDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  studentId!: string;

  @ApiProperty()
  studentName!: string;

  @ApiProperty()
  studentCode!: string;

  @ApiProperty()
  feeStructureId!: string;

  @ApiProperty()
  feeStructureName!: string;

  @ApiProperty()
  assignedAmount!: number;

  @ApiProperty()
  paidAmount!: number;

  @ApiProperty()
  outstandingAmount!: number;

  @ApiProperty({ enum: StudentFeeStatus })
  status!: StudentFeeStatus;

  @ApiPropertyOptional({ nullable: true })
  assignedOn!: string;

  @ApiPropertyOptional({ nullable: true })
  latestPaymentDate!: string | null;

  @ApiPropertyOptional({ nullable: true })
  latestPaymentMethod!: FeePaymentMethod | null;
}

export class FeeReportBreakdownDto {
  @ApiProperty({ type: [FeeReportPaymentMethodRowDto] })
  byPaymentMethod!: FeeReportPaymentMethodRowDto[];

  @ApiProperty({ type: [FeeReportStructureRowDto] })
  byFeeStructure!: FeeReportStructureRowDto[];

  @ApiProperty({ type: [FeeReportStatusRowDto] })
  byStatus!: FeeReportStatusRowDto[];
}

export class FeeReportResponseDto {
  @ApiProperty({ type: [FeeReportRecordDto] })
  data!: FeeReportRecordDto[];

  @ApiProperty()
  meta!: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };

  @ApiProperty({ type: FeeReportSummaryDto })
  summary!: FeeReportSummaryDto;

  @ApiProperty({ type: FeeReportBreakdownDto })
  breakdown!: FeeReportBreakdownDto;
}
