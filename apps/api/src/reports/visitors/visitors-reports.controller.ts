import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../auth/types/authenticated-user.types';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { VisitorReportQueryDto } from './dto/visitor-report-query.dto';
import { VisitorReportResponseDto } from './dto/visitor-report-response.dto';
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
}
