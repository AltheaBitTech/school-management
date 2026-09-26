import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../auth/types/authenticated-user.types';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AttendanceReportsService } from './attendance-reports.service';
import { AttendanceReportQueryDto } from './dto/attendance-report-query.dto';
import { AttendanceReportResponseDto } from './dto/attendance-report-response.dto';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
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
}
