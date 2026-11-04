import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { AttendanceFeatureGuard } from '../common/features/attendance-feature.guard';
import { LeaveRequestResponseDto } from '../leave/dto/leave-response.dto';
import { CreateStaffSelfLeaveRequestDto } from './dto/create-staff-self-leave-request.dto';
import { StaffSelfAttendanceQueryDto } from './dto/staff-self-attendance-query.dto';
import {
  StaffSelfDashboardResponseDto,
  StaffSelfLeaveRequestDetailResponseDto,
} from './dto/staff-self-response.dto';
import { StaffSelfService } from './staff-self.service';

@ApiTags('staff-self')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('me')
export class StaffSelfController {
  constructor(private readonly staffSelfService: StaffSelfService) {}

  @Get('dashboard')
  @RequirePermissions('staff.self.view')
  @ApiOperation({ summary: 'Staff self-service dashboard summary' })
  @ApiOkResponse({ type: StaffSelfDashboardResponseDto })
  async getDashboard(@CurrentUser() user: AuthenticatedUser): Promise<StaffSelfDashboardResponseDto> {
    const data = await this.staffSelfService.getDashboard(user);
    return { data };
  }

  @Get('attendance-qr')
  @UseGuards(AttendanceFeatureGuard)
  @RequirePermissions('staff.self.attendance.view')
  @ApiOperation({ summary: 'QR code for the signed-in staff member' })
  async attendanceQr(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.staffSelfService.issueAttendanceQr(user);
    return { data };
  }

  @Get('attendance')
  @UseGuards(AttendanceFeatureGuard)
  @RequirePermissions('staff.self.attendance.view')
  @ApiOperation({ summary: 'List attendance records for the authenticated staff member' })
  async listAttendance(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: StaffSelfAttendanceQueryDto,
  ) {
    return this.staffSelfService.listAttendance(user, query);
  }

  @Get('leave/balances')
  @RequirePermissions('staff.self.leave.view')
  @ApiOperation({ summary: 'List leave balances for the authenticated staff member' })
  async listLeaveBalances(@CurrentUser() user: AuthenticatedUser, @Query() query: PaginationQueryDto) {
    return this.staffSelfService.listLeaveBalances(user, query);
  }

  @Get('leave/types')
  @RequirePermissions('staff.self.leave.create')
  @ApiOperation({ summary: 'List active leave types available for self-service submission' })
  async listLeaveTypes(@CurrentUser() user: AuthenticatedUser, @Query() query: PaginationQueryDto) {
    return this.staffSelfService.listLeaveTypes(user, query);
  }

  @Get('leave/requests')
  @RequirePermissions('staff.self.leave.view')
  @ApiOperation({ summary: 'List leave requests for the authenticated staff member' })
  async listLeaveRequests(@CurrentUser() user: AuthenticatedUser, @Query() query: PaginationQueryDto) {
    return this.staffSelfService.listLeaveRequests(user, query);
  }

  @Get('leave/requests/:id')
  @RequirePermissions('staff.self.leave.view')
  @ApiOperation({ summary: 'Get a leave request owned by the authenticated staff member' })
  @ApiOkResponse({ type: StaffSelfLeaveRequestDetailResponseDto })
  async getLeaveRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StaffSelfLeaveRequestDetailResponseDto> {
    const data = await this.staffSelfService.getLeaveRequest(user, id);
    return { data };
  }

  @Post('leave/requests')
  @RequirePermissions('staff.self.leave.create')
  @ApiOperation({ summary: 'Submit a leave request for the authenticated staff member' })
  @ApiOkResponse({ type: LeaveRequestResponseDto })
  async createLeaveRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateStaffSelfLeaveRequestDto,
  ): Promise<LeaveRequestResponseDto> {
    const data = await this.staffSelfService.createLeaveRequest(user, body);
    return { data };
  }
}
