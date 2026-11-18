import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { AttendanceFeatureGuard } from '../common/features/attendance-feature.guard';
import { getEffectivePermissionsFromRequest, PermissionsGuard } from '../common/guards/permissions.guard';
import { AuthenticatedRequest } from '../common/types/authenticated-request.types';
import {
  CreateSectionSubstituteDto,
  SaveSectionAttendanceDto,
  StudentAttendanceDateQueryDto,
} from './dto/student-attendance.dto';
import { StudentAttendanceActor, StudentAttendanceService } from './student-attendance.service';

@ApiTags('student-attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, AttendanceFeatureGuard)
@Controller('student-attendance')
export class StudentAttendanceController {
  constructor(private readonly service: StudentAttendanceService) {}

  @Get('my-sections')
  @RequirePermissions('student.attendance.view')
  @ApiOperation({ summary: 'Sections the current user can take attendance for (class teacher, substitute or admin)' })
  async mySections(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
    @Query() query: StudentAttendanceDateQueryDto,
  ) {
    return { data: await this.service.listMySections(this.actor(user, request), query.date) };
  }

  @Get('sections/:sectionId')
  @RequirePermissions('student.attendance.view')
  @ApiOperation({ summary: 'Students of a section with their attendance for a date' })
  async getSection(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Query() query: StudentAttendanceDateQueryDto,
  ) {
    return { data: await this.service.getSectionAttendance(this.actor(user, request), sectionId, query.date) };
  }

  @Put('sections/:sectionId')
  @RequirePermissions('student.attendance.mark')
  @ApiOperation({ summary: 'Save attendance for a whole section on a date' })
  async saveSection(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() dto: SaveSectionAttendanceDto,
  ) {
    return { data: await this.service.saveSectionAttendance(this.actor(user, request), sectionId, dto) };
  }

  @Get('sections/:sectionId/substitutes')
  @RequirePermissions('student.attendance.manage')
  @ApiOperation({ summary: 'Active and upcoming substitute teachers for a section' })
  async listSubstitutes(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
  ) {
    return { data: await this.service.listSubstitutes(user.organizationId, sectionId) };
  }

  @Post('sections/:sectionId/substitutes')
  @RequirePermissions('student.attendance.manage')
  @ApiOperation({ summary: 'Allow another staff member to take attendance for a section over a date range' })
  async createSubstitute(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() dto: CreateSectionSubstituteDto,
  ) {
    return { data: await this.service.createSubstitute(this.actor(user, request), sectionId, dto) };
  }

  @Delete('substitutes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('student.attendance.manage')
  @ApiOperation({ summary: 'Revoke a substitute assignment' })
  async revokeSubstitute(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.service.revokeSubstitute(user.organizationId, id);
  }

  private actor(user: AuthenticatedUser, request: AuthenticatedRequest): StudentAttendanceActor {
    return {
      userId: user.userId,
      organizationId: user.organizationId,
      permissions: getEffectivePermissionsFromRequest(request),
    };
  }
}
