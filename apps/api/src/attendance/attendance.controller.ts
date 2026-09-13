import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { AttendanceService } from './attendance.service';
import {
  AttendanceResponseDto,
  PaginatedAttendanceResponseDto,
} from './dto/attendance-response.dto';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { ListAttendanceQueryDto } from './dto/list-attendance-query.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';

@ApiTags('attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  @RequirePermissions('attendance.view')
  @ApiOperation({ summary: 'List staff attendance records for the current organization' })
  @ApiOkResponse({ type: PaginatedAttendanceResponseDto })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListAttendanceQueryDto,
  ) {
    return this.attendanceService.list(user.organizationId, query);
  }

  @Post()
  @RequirePermissions('attendance.mark')
  @ApiOperation({ summary: 'Mark attendance for a staff member on a calendar date' })
  @ApiOkResponse({ type: AttendanceResponseDto })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAttendanceDto,
  ) {
    const attendance = await this.attendanceService.create(user.organizationId, dto);
    return { data: this.attendanceService.toDto(attendance) };
  }

  @Get(':id')
  @RequirePermissions('attendance.view')
  @ApiOperation({ summary: 'Get an attendance record by ID' })
  @ApiOkResponse({ type: AttendanceResponseDto })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const attendance = await this.attendanceService.findById(user.organizationId, id);
    return { data: this.attendanceService.toDto(attendance) };
  }

  @Patch(':id')
  @RequirePermissions('attendance.update')
  @ApiOperation({ summary: 'Update an attendance record' })
  @ApiOkResponse({ type: AttendanceResponseDto })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAttendanceDto,
  ) {
    const attendance = await this.attendanceService.update(user.organizationId, id, dto);
    return { data: this.attendanceService.toDto(attendance) };
  }
}
