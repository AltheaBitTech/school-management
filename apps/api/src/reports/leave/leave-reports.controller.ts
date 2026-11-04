import { Controller, Get, Header, Query, StreamableFile, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../auth/types/authenticated-user.types';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { LeaveReportQueryDto } from './dto/leave-report-query.dto';
import { LeaveReportResponseDto } from './dto/leave-report-response.dto';
import { buildPdfFromCsv } from '../common/pdf-from-csv.util';
import { LeaveReportsService } from './leave-reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('reports')
export class LeaveReportsController {
  constructor(private readonly leaveReportsService: LeaveReportsService) {}

  @Get('leave')
  @RequirePermissions('report.leave.view')
  @ApiOperation({ summary: 'Generate a tenant-scoped leave operations report' })
  @ApiOkResponse({ type: LeaveReportResponseDto })
  async generate(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: LeaveReportQueryDto,
  ) {
    return this.leaveReportsService.generate(user.organizationId, query);
  }

  @Get('leave/export.csv')
  @RequirePermissions('report.leave.view')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="leave-report.csv"')
  @ApiOperation({ summary: 'Export leave report rows as CSV' })
  async exportCsv(@CurrentUser() user: AuthenticatedUser, @Query() query: LeaveReportQueryDto) {
    return this.leaveReportsService.exportCsv(user.organizationId, query);
  }

  @Get('leave/export.pdf')
  @RequirePermissions('report.leave.view')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="leave-report.pdf"')
  async exportPdf(@CurrentUser() user: AuthenticatedUser, @Query() query: LeaveReportQueryDto) {
    const csv = await this.leaveReportsService.exportCsv(user.organizationId, query);
    return new StreamableFile(await buildPdfFromCsv('Leave report', csv));
  }
}
