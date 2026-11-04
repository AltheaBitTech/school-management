import { Controller, Get, Header, Query, StreamableFile, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../auth/types/authenticated-user.types';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { EventReportResponseDto } from './dto/event-report-response.dto';
import { EventReportQueryDto } from './dto/event-report-query.dto';
import { buildPdfFromCsv } from '../common/pdf-from-csv.util';
import { EventReportsService } from './event-reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('reports')
export class EventReportsController {
  constructor(private readonly eventReportsService: EventReportsService) {}

  @Get('events')
  @RequirePermissions('report.event.view')
  @ApiOperation({ summary: 'Generate a tenant-scoped Event operations report' })
  @ApiOkResponse({ type: EventReportResponseDto })
  async generate(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: EventReportQueryDto,
  ) {
    return this.eventReportsService.generate(user.organizationId, query);
  }

  @Get('events/export.csv')
  @RequirePermissions('report.event.view')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="events-report.csv"')
  @ApiOperation({ summary: 'Export event report rows as CSV' })
  async exportCsv(@CurrentUser() user: AuthenticatedUser, @Query() query: EventReportQueryDto) {
    return this.eventReportsService.exportCsv(user.organizationId, query);
  }

  @Get('events/export.pdf')
  @RequirePermissions('report.event.view')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="events-report.pdf"')
  async exportPdf(@CurrentUser() user: AuthenticatedUser, @Query() query: EventReportQueryDto) {
    const csv = await this.eventReportsService.exportCsv(user.organizationId, query);
    return new StreamableFile(await buildPdfFromCsv('Events report', csv));
  }
}
