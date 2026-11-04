import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { getRequestId } from '../common/middleware/correlation-id.middleware';
import { CreateFeeStructureDto } from './dto/create-fee-structure.dto';
import { CreateStudentFeeDto } from './dto/create-student-fee.dto';
import {
  FeeStructureResponseDto,
  PaginatedFeeStructuresResponseDto,
  PaginatedStudentFeesResponseDto,
  RecordFeePaymentResponseDto,
  StudentFeeResponseDto,
  StudentFeeSummaryResponseDto,
} from './dto/fee-response.dto';
import { ListFeeStructuresQueryDto } from './dto/list-fee-structures-query.dto';
import { ListStudentFeesQueryDto } from './dto/list-student-fees-query.dto';
import { RecordFeePaymentDto } from './dto/record-fee-payment.dto';
import { FeeStructuresService } from './fee-structures.service';
import { StudentFeesService } from './student-fees.service';
import { PermissionsService } from '../permissions/permissions.service';

@ApiTags('fees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('fees/structures')
export class FeeStructuresController {
  constructor(private readonly feeStructuresService: FeeStructuresService) {}

  @Get()
  @RequirePermissions('fee.view')
  @ApiOperation({ summary: 'List fee structures for the current organization' })
  @ApiOkResponse({ type: PaginatedFeeStructuresResponseDto })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListFeeStructuresQueryDto,
  ) {
    return this.feeStructuresService.list(user.organizationId, query);
  }

  @Post()
  @RequirePermissions('fee.create')
  @ApiOperation({ summary: 'Create a fee structure' })
  @ApiOkResponse({ type: FeeStructureResponseDto })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateFeeStructureDto,
    @Req() request: Request,
  ) {
    const feeStructure = await this.feeStructuresService.create(user, dto, {
      requestId: getRequestId(request),
    });

    return { data: this.feeStructuresService.toDto(feeStructure) };
  }
}

@ApiTags('fees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('fees/student-fees')
export class StudentFeesController {
  constructor(
    private readonly studentFeesService: StudentFeesService,
    private readonly permissionsService: PermissionsService,
  ) {}

  @Get()
  @RequirePermissions('fee.view')
  @ApiOperation({ summary: 'List assigned student fees' })
  @ApiOkResponse({ type: PaginatedStudentFeesResponseDto })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListStudentFeesQueryDto,
  ) {
    return this.studentFeesService.list(user.organizationId, query);
  }

  @Post()
  @RequirePermissions('fee.assign')
  @ApiOperation({ summary: 'Assign a fee structure to a student' })
  @ApiOkResponse({ type: StudentFeeResponseDto })
  async assign(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateStudentFeeDto,
    @Req() request: Request,
  ) {
    const studentFee = await this.studentFeesService.assign(user, dto, {
      requestId: getRequestId(request),
    });

    return { data: this.studentFeesService.toDetailDto(studentFee) };
  }

  @Get(':id')
  @RequirePermissions('fee.view')
  @ApiOperation({ summary: 'Get a student fee assignment with payment history' })
  @ApiOkResponse({ type: StudentFeeResponseDto })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const studentFee = await this.studentFeesService.findById(user.organizationId, id);
    return { data: this.studentFeesService.toDetailDto(studentFee) };
  }

  @Post(':id/payments')
  @RequirePermissions('fee.record_payment')
  @ApiOperation({ summary: 'Record a payment against a student fee assignment' })
  @ApiOkResponse({ type: RecordFeePaymentResponseDto })
  async recordPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordFeePaymentDto,
    @Req() request: Request,
  ) {
    const result = await this.studentFeesService.recordPayment(user, id, dto, {
      requestId: getRequestId(request),
    });

    return { data: result };
  }

  @Get(':id/payments/:paymentId/receipt')
  @ApiOperation({ summary: 'Download a PDF receipt for a fee payment' })
  async downloadPaymentReceipt(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
  ): Promise<StreamableFile> {
    const permissions =
      (await this.permissionsService.getEffectivePermissions(
        user.userId,
        user.organizationId,
        user.activeRoleId ?? '',
      )) ?? [];
    const { buffer, filename } = await this.studentFeesService.downloadPaymentReceipt(
      user,
      id,
      paymentId,
      permissions,
    );

    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${filename}"`,
      length: buffer.length,
    });
  }
}

@ApiTags('fees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('fees/students')
export class StudentFeeSummaryController {
  constructor(private readonly studentFeesService: StudentFeesService) {}

  @Get(':studentId/summary')
  @RequirePermissions('fee.view')
  @ApiOperation({ summary: 'Get fee summary for a student' })
  @ApiOkResponse({ type: StudentFeeSummaryResponseDto })
  async getSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ) {
    const summary = await this.studentFeesService.getStudentSummary(
      user.organizationId,
      studentId,
    );

    return { data: summary };
  }
}
