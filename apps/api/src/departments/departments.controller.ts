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
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import {
  DepartmentResponseDto,
  PaginatedDepartmentsResponseDto,
} from './dto/department-response.dto';
import { ListDepartmentsQueryDto } from './dto/list-departments-query.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@ApiTags('departments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  @RequirePermissions('department.view')
  @ApiOperation({ summary: 'List departments for the current organization' })
  @ApiOkResponse({ type: PaginatedDepartmentsResponseDto })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListDepartmentsQueryDto,
  ) {
    return this.departmentsService.list(user.organizationId, query);
  }

  @Post()
  @RequirePermissions('department.create')
  @ApiOperation({ summary: 'Create a department' })
  @ApiOkResponse({ type: DepartmentResponseDto })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDepartmentDto,
  ) {
    const department = await this.departmentsService.create(user.organizationId, dto);
    return { data: this.departmentsService.toDto(department) };
  }

  @Get(':id')
  @RequirePermissions('department.view')
  @ApiOperation({ summary: 'Get a department by ID' })
  @ApiOkResponse({ type: DepartmentResponseDto })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const department = await this.departmentsService.findById(user.organizationId, id);
    return { data: this.departmentsService.toDto(department) };
  }

  @Patch(':id')
  @RequirePermissions('department.update')
  @ApiOperation({ summary: 'Update a department' })
  @ApiOkResponse({ type: DepartmentResponseDto })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    const department = await this.departmentsService.update(user.organizationId, id, dto);
    return { data: this.departmentsService.toDto(department) };
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('department.deactivate')
  @ApiOperation({ summary: 'Deactivate a department' })
  @ApiOkResponse({ type: DepartmentResponseDto })
  async deactivate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const department = await this.departmentsService.deactivate(user.organizationId, id);
    return { data: this.departmentsService.toDto(department) };
  }
}
