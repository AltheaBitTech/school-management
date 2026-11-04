import { Controller, Get, Header, Query, StreamableFile, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../auth/types/authenticated-user.types';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { ComplaintReportQueryDto } from './dto/complaint-report-query.dto';
import { ComplaintReportResponseDto } from './dto/complaint-report-response.dto';
import { buildPdfFromCsv } from '../common/pdf-from-csv.util';
import { ComplaintsReportsService } from './complaints-reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('reports/complaints')
export class ComplaintsReportsController {
  constructor(private readonly complaintsReportsService: ComplaintsReportsService) {}

  @Get()
  @RequirePermissions('report.complaints.view')
  @ApiOperation({ summary: 'Generate complaint operations report for the current organization' })
  @ApiOkResponse({ type: ComplaintReportResponseDto })
  async getReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ComplaintReportQueryDto,
  ): Promise<ComplaintReportResponseDto> {
    return this.complaintsReportsService.generate(user.organizationId, query);
  }

  @Get('export.csv')
  @RequirePermissions('report.complaints.view')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="complaints-report.csv"')
  @ApiOperation({ summary: 'Export complaint report rows as CSV' })
  async exportCsv(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ComplaintReportQueryDto,
  ): Promise<string> {
    return this.complaintsReportsService.exportCsv(user.organizationId, query);
  }

  @Get('export.pdf')
  @RequirePermissions('report.complaints.view')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="complaints-report.pdf"')
  async exportPdf(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ComplaintReportQueryDto,
  ) {
    const csv = await this.complaintsReportsService.exportCsv(user.organizationId, query);
    return new StreamableFile(await buildPdfFromCsv('Complaints report', csv));
  }
}
