import { Controller, Get, Header, Query, StreamableFile, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../auth/types/authenticated-user.types';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { VisitorReportQueryDto } from './dto/visitor-report-query.dto';
import { VisitorReportResponseDto } from './dto/visitor-report-response.dto';
import { buildPdfFromCsv } from '../common/pdf-from-csv.util';
import { VisitorsReportsService } from './visitors-reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('reports/visitors')
export class VisitorsReportsController {
  constructor(private readonly visitorsReportsService: VisitorsReportsService) {}

  @Get()
  @RequirePermissions('report.visitors.view')
  @ApiOperation({ summary: 'Generate visitor operations report for the current organization' })
  @ApiOkResponse({ type: VisitorReportResponseDto })
  async getReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: VisitorReportQueryDto,
  ): Promise<VisitorReportResponseDto> {
    return this.visitorsReportsService.generate(user.organizationId, query);
  }

  @Get('export.csv')
  @RequirePermissions('report.visitors.view')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="visitors-report.csv"')
  @ApiOperation({ summary: 'Export visitor report rows as CSV' })
  async exportCsv(@CurrentUser() user: AuthenticatedUser, @Query() query: VisitorReportQueryDto) {
    return this.visitorsReportsService.exportCsv(user.organizationId, query);
  }

  @Get('export.pdf')
  @RequirePermissions('report.visitors.view')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="visitors-report.pdf"')
  @ApiOperation({ summary: 'Export visitor report rows as PDF' })
  async exportPdf(@CurrentUser() user: AuthenticatedUser, @Query() query: VisitorReportQueryDto) {
    const csv = await this.visitorsReportsService.exportCsv(user.organizationId, query);
    const pdf = await buildPdfFromCsv('Visitor report', csv);
    return new StreamableFile(pdf);
  }
}
