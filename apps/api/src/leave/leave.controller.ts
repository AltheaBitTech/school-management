import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { getRequestId } from '../common/middleware/correlation-id.middleware';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PermissionsService } from '../permissions/permissions.service';
import { CreateLeaveRequestDto, ListLeaveRequestsQueryDto } from './dto/leave-request.dto';
import { CreateLeaveBalanceDto, ListLeaveBalancesQueryDto } from './dto/leave-balance.dto';
import { CreateLeaveTypeDto, UpdateLeaveTypeDto } from './dto/leave-type.dto';
import {
  LeaveBalanceResponseDto,
  LeaveRequestResponseDto,
  LeaveTypeResponseDto,
  PaginatedLeaveBalancesResponseDto,
  PaginatedLeaveRequestsResponseDto,
  PaginatedLeaveTypesResponseDto,
} from './dto/leave-response.dto';
import { LeaveBalancesService } from './leave-balances.service';
import { LeaveRequestsService } from './leave-requests.service';
import { LeaveTypesService } from './leave-types.service';
import { Request } from 'express';

@ApiTags('leave-types')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('leave/types')
export class LeaveTypesController {
  constructor(private readonly leaveTypesService: LeaveTypesService) {}

  @Get()
  @RequirePermissions('leave.view')
  @ApiOperation({ summary: 'List leave types for the current organization' })
  @ApiOkResponse({ type: PaginatedLeaveTypesResponseDto })
  async list(@CurrentUser() user: AuthenticatedUser, @Query() query: PaginationQueryDto) {
    return this.leaveTypesService.list(user.organizationId, query);
  }

  @Post()
  @RequirePermissions('leave.configure_types')
  @ApiOperation({ summary: 'Create a leave type' })
  @ApiOkResponse({ type: LeaveTypeResponseDto })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateLeaveTypeDto) {
    const leaveType = await this.leaveTypesService.create(user.organizationId, dto);
    return { data: this.leaveTypesService.toDto(leaveType) };
  }

  @Get(':id')
  @RequirePermissions('leave.view')
  @ApiOperation({ summary: 'Get a leave type by ID' })
  @ApiOkResponse({ type: LeaveTypeResponseDto })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const leaveType = await this.leaveTypesService.findById(user.organizationId, id);
    return { data: this.leaveTypesService.toDto(leaveType) };
  }

  @Patch(':id')
  @RequirePermissions('leave.configure_types')
  @ApiOperation({ summary: 'Update a leave type' })
  @ApiOkResponse({ type: LeaveTypeResponseDto })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeaveTypeDto,
  ) {
    const leaveType = await this.leaveTypesService.update(user.organizationId, id, dto);
    return { data: this.leaveTypesService.toDto(leaveType) };
  }
}

@ApiTags('leave-balances')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('leave/balances')
export class LeaveBalancesController {
  constructor(private readonly leaveBalancesService: LeaveBalancesService) {}

  @Get()
  @RequirePermissions('leave.view')
  @ApiOperation({ summary: 'List leave balances for the current organization' })
  @ApiOkResponse({ type: PaginatedLeaveBalancesResponseDto })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListLeaveBalancesQueryDto,
  ) {
    return this.leaveBalancesService.list(user.organizationId, query);
  }

  @Post()
  @RequirePermissions('leave.manage_balances')
  @ApiOperation({ summary: 'Initialize a leave balance' })
  @ApiOkResponse({ type: LeaveBalanceResponseDto })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateLeaveBalanceDto) {
    const balance = await this.leaveBalancesService.create(user.organizationId, dto);
    return { data: this.leaveBalancesService.toDto(balance) };
  }
}

@ApiTags('leave-requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('leave/requests')
export class LeaveRequestsController {
  constructor(
    private readonly leaveRequestsService: LeaveRequestsService,
    private readonly permissionsService: PermissionsService,
  ) {}

  @Get()
  @RequirePermissions('leave.view')
  @ApiOperation({ summary: 'List leave requests for the current organization' })
  @ApiOkResponse({ type: PaginatedLeaveRequestsResponseDto })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListLeaveRequestsQueryDto,
  ) {
    return this.leaveRequestsService.list(user.organizationId, query);
  }

  @Post()
  @RequirePermissions('leave.create')
  @ApiOperation({ summary: 'Submit a leave request' })
  @ApiOkResponse({ type: LeaveRequestResponseDto })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateLeaveRequestDto) {
    const permissions =
      (await this.permissionsService.getEffectivePermissions(
        user.userId,
        user.organizationId,
        user.activeRoleId ?? '',
      )) ?? [];
    const canSubmitForOthers = permissions.includes('leave.manage_balances');
    const request = await this.leaveRequestsService.create(
      user.organizationId,
      user,
      dto,
      canSubmitForOthers,
    );
    return { data: this.leaveRequestsService.toDto(request) };
  }

  @Get(':id')
  @RequirePermissions('leave.view')
  @ApiOperation({ summary: 'Get a leave request by ID' })
  @ApiOkResponse({ type: LeaveRequestResponseDto })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const request = await this.leaveRequestsService.findById(user.organizationId, id);
    return { data: this.leaveRequestsService.toDto(request) };
  }

  @Post(':id/approve')
  @RequirePermissions('leave.approve')
  @ApiOperation({ summary: 'Approve a pending leave request' })
  @ApiOkResponse({ type: LeaveRequestResponseDto })
  async approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request,
  ) {
    const leaveRequest = await this.leaveRequestsService.approve(user.organizationId, id, user, {
      requestId: getRequestId(request),
    });
    return { data: this.leaveRequestsService.toDto(leaveRequest) };
  }

  @Post(':id/reject')
  @RequirePermissions('leave.reject')
  @ApiOperation({ summary: 'Reject a pending leave request' })
  @ApiOkResponse({ type: LeaveRequestResponseDto })
  async reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request,
  ) {
    const leaveRequest = await this.leaveRequestsService.reject(user.organizationId, id, user, {
      requestId: getRequestId(request),
    });
    return { data: this.leaveRequestsService.toDto(leaveRequest) };
  }
}
