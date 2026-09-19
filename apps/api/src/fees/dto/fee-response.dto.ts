import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  FeePaymentMethod,
  FeeStructureStatus,
  StudentFeeStatus,
} from '@prisma/client';
import { PaginationMeta } from '../../common/dto/pagination-query.dto';

export class FeeStructureDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  amount!: number;

  @ApiProperty()
  periodStart!: string;

  @ApiProperty()
  periodEnd!: string;

  @ApiProperty({ enum: FeeStructureStatus })
  status!: FeeStructureStatus;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class FeeStructureResponseDto {
  @ApiProperty({ type: FeeStructureDto })
  data!: FeeStructureDto;
}

export class PaginatedFeeStructuresResponseDto {
  @ApiProperty({ type: [FeeStructureDto] })
  data!: FeeStructureDto[];

  @ApiProperty()
  meta!: PaginationMeta;
}

export class StudentSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  studentCode!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiPropertyOptional()
  displayName?: string | null;
}

export class FeeStructureSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;
}

export class FeePaymentDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  amount!: number;

  @ApiProperty()
  paymentDate!: string;

  @ApiProperty({ enum: FeePaymentMethod })
  paymentMethod!: FeePaymentMethod;

  @ApiPropertyOptional()
  reference?: string | null;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiProperty({ format: 'uuid' })
  createdByUserId!: string;

  @ApiProperty()
  createdAt!: string;
}

export class StudentFeeDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  studentId!: string;

  @ApiProperty({ format: 'uuid' })
  feeStructureId!: string;

  @ApiProperty()
  assignedAmount!: number;

  @ApiProperty()
  paidAmount!: number;

  @ApiProperty()
  outstandingAmount!: number;

  @ApiPropertyOptional()
  dueDate?: string | null;

  @ApiProperty({ enum: StudentFeeStatus })
  status!: StudentFeeStatus;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiPropertyOptional({ type: StudentSummaryDto })
  student?: StudentSummaryDto;

  @ApiPropertyOptional({ type: FeeStructureSummaryDto })
  feeStructure?: FeeStructureSummaryDto;
}

export class StudentFeeDetailDto extends StudentFeeDto {
  @ApiProperty({ type: [FeePaymentDto] })
  payments!: FeePaymentDto[];
}

export class StudentFeeResponseDto {
  @ApiProperty({ type: StudentFeeDetailDto })
  data!: StudentFeeDetailDto;
}

export class PaginatedStudentFeesResponseDto {
  @ApiProperty({ type: [StudentFeeDto] })
  data!: StudentFeeDto[];

  @ApiProperty()
  meta!: PaginationMeta;
}

export class StudentFeeSummaryItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

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

  @ApiPropertyOptional()
  dueDate?: string | null;
}

export class StudentFeeSummaryDto {
  @ApiProperty({ format: 'uuid' })
  studentId!: string;

  @ApiProperty()
  totalAssigned!: number;

  @ApiProperty()
  totalPaid!: number;

  @ApiProperty()
  totalOutstanding!: number;

  @ApiProperty({ type: [StudentFeeSummaryItemDto] })
  fees!: StudentFeeSummaryItemDto[];
}

export class StudentFeeSummaryResponseDto {
  @ApiProperty({ type: StudentFeeSummaryDto })
  data!: StudentFeeSummaryDto;
}

export class FeePaymentResponseDto {
  @ApiProperty({ type: FeePaymentDto })
  data!: FeePaymentDto;
}

export class RecordFeePaymentResultDto {
  @ApiProperty({ type: FeePaymentDto })
  payment!: FeePaymentDto;

  @ApiProperty({ type: StudentFeeDetailDto })
  studentFee!: StudentFeeDetailDto;
}

export class RecordFeePaymentResponseDto {
  @ApiProperty({ type: RecordFeePaymentResultDto })
  data!: RecordFeePaymentResultDto;
}
