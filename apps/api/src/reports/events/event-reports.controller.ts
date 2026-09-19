import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../auth/types/authenticated-user.types';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { EventReportResponseDto } from './dto/event-report-response.dto';
import { EventReportQueryDto } from './dto/event-report-query.dto';
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
}
