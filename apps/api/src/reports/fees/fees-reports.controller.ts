import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../auth/types/authenticated-user.types';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { FeeReportQueryDto } from './dto/fee-report-query.dto';
import { FeeReportResponseDto } from './dto/fee-report-response.dto';
import { FeesReportsService } from './fees-reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('reports/fees')
export class FeesReportsController {
  constructor(private readonly feesReportsService: FeesReportsService) {}

  @Get()
  @RequirePermissions('report.fees.view')
  @ApiOperation({ summary: 'Generate fee operations report for the current organization' })
  @ApiOkResponse({ type: FeeReportResponseDto })
  async getReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: FeeReportQueryDto,
  ): Promise<FeeReportResponseDto> {
    return this.feesReportsService.generate(user.organizationId, query);
  }
}
