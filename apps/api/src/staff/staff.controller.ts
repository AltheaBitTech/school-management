import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
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
import { getRequestId } from '../common/middleware/correlation-id.middleware';
import { CreateStaffDto } from './dto/create-staff.dto';
import { ListStaffQueryDto } from './dto/list-staff-query.dto';
import {
  PaginatedStaffResponseDto,
  StaffResponseDto,
} from './dto/staff-response.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { ProvisionStaffLoginDto } from './dto/provision-staff-login.dto';
import { ProvisionStaffLoginResponseDto } from './dto/provision-staff-login-response.dto';
import { StaffLoginProvisioningService } from './staff-login-provisioning.service';
import { StaffService } from './staff.service';
import { Request } from 'express';

@ApiTags('staff')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('staff')
export class StaffController {
  constructor(
    private readonly staffService: StaffService,
    private readonly staffLoginProvisioningService: StaffLoginProvisioningService,
  ) {}

  @Get()
  @RequirePermissions('staff.view')
  @ApiOperation({ summary: 'List staff for the current organization' })
  @ApiOkResponse({ type: PaginatedStaffResponseDto })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListStaffQueryDto,
  ) {
    return this.staffService.list(user.organizationId, query);
  }

  @Post()
  @RequirePermissions('staff.create')
  @ApiOperation({ summary: 'Create a staff member' })
  @ApiOkResponse({ type: StaffResponseDto })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateStaffDto,
  ) {
    const staff = await this.staffService.create(user.organizationId, dto);
    return { data: this.staffService.toDto(staff) };
  }

  @Get(':id')
  @RequirePermissions('staff.view')
  @ApiOperation({ summary: 'Get a staff member by ID' })
  @ApiOkResponse({ type: StaffResponseDto })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const staff = await this.staffService.findById(user.organizationId, id);
    return { data: this.staffService.toDto(staff) };
  }

  @Patch(':id')
  @RequirePermissions('staff.update')
  @ApiOperation({ summary: 'Update a staff member' })
  @ApiOkResponse({ type: StaffResponseDto })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStaffDto,
  ) {
    const staff = await this.staffService.update(user.organizationId, id, dto);
    return { data: this.staffService.toDto(staff) };
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('staff.deactivate')
  @ApiOperation({ summary: 'Deactivate a staff member' })
  @ApiOkResponse({ type: StaffResponseDto })
  async deactivate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const staff = await this.staffService.deactivate(user.organizationId, id);
    return { data: this.staffService.toDto(staff) };
  }

  @Post(':id/provision-login')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('user.create', 'role.assign')
  @ApiOperation({ summary: 'Provision a login account for an existing staff member' })
  @ApiOkResponse({ type: ProvisionStaffLoginResponseDto })
  async provisionLogin(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProvisionStaffLoginDto,
    @Req() request: Request,
  ): Promise<ProvisionStaffLoginResponseDto> {
    const result = await this.staffLoginProvisioningService.provisionLogin(
      user,
      id,
      dto,
      { requestId: getRequestId(request) },
    );

    return {
      data: {
        staff: this.staffService.toDto(result.staff),
        loginEmail: result.loginEmail,
      },
    };
  }
}
