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
import { CreateStaffDto } from './dto/create-staff.dto';
import { ListStaffQueryDto } from './dto/list-staff-query.dto';
import {
  PaginatedStaffResponseDto,
  StaffResponseDto,
} from './dto/staff-response.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { StaffService } from './staff.service';

@ApiTags('staff')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

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
}
