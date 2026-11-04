import { Controller, Get, Header, Query, StreamableFile, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../auth/types/authenticated-user.types';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AttendanceFeatureGuard } from '../../common/features/attendance-feature.guard';
import { buildPdfFromCsv } from '../common/pdf-from-csv.util';
import { AttendanceReportsService } from './attendance-reports.service';
import { AttendanceReportQueryDto } from './dto/attendance-report-query.dto';
import { AttendanceReportResponseDto } from './dto/attendance-report-response.dto';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, AttendanceFeatureGuard)
@Controller('reports')
export class AttendanceReportsController {
  constructor(private readonly attendanceReportsService: AttendanceReportsService) {}

  @Get('attendance')
  @RequirePermissions('report.attendance.view')
  @ApiOperation({ summary: 'Generate a tenant-scoped staff attendance report' })
  @ApiOkResponse({ type: AttendanceReportResponseDto })
  async generate(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AttendanceReportQueryDto,
  ) {
    return this.attendanceReportsService.generate(user.organizationId, query);
  }

  @Get('attendance/export.csv')
  @RequirePermissions('report.attendance.view')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="attendance-report.csv"')
  @ApiOperation({ summary: 'Export attendance report rows as CSV' })
  async exportCsv(@CurrentUser() user: AuthenticatedUser, @Query() query: AttendanceReportQueryDto) {
    return this.attendanceReportsService.exportCsv(user.organizationId, query);
  }

  @Get('attendance/export.pdf')
  @RequirePermissions('report.attendance.view')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="attendance-report.pdf"')
  async exportPdf(@CurrentUser() user: AuthenticatedUser, @Query() query: AttendanceReportQueryDto) {
    const csv = await this.attendanceReportsService.exportCsv(user.organizationId, query);
    return new StreamableFile(await buildPdfFromCsv('Attendance report', csv));
  }
}
