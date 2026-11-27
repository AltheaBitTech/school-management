import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { getRequestId } from '../common/middleware/correlation-id.middleware';
import { CreateRoleDto, UpdateRoleDto } from './dto/role-mutation.dto';
import {
  PermissionCatalogResponseDto,
  RoleDetailResponseDto,
  RoleListResponseDto,
} from './dto/role-response.dto';
import { RoleManagementService } from './role-management.service';

@ApiTags('roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiUnauthorizedResponse({ description: 'Unauthenticated' })
@ApiForbiddenResponse({ description: 'Missing required permission' })
@Controller('roles')
export class RolesController {
  constructor(private readonly roleManagementService: RoleManagementService) {}

  @Get()
  @RequirePermissions('role.view')
  @ApiOperation({ summary: 'List organization-scoped roles for the current tenant' })
  @ApiOkResponse({ type: RoleListResponseDto })
  async list(@CurrentUser() user: AuthenticatedUser): Promise<RoleListResponseDto> {
    return { data: await this.roleManagementService.listRoles(user.organizationId) };
  }

  @Get('permissions-catalog')
  @RequirePermissions('role.view')
  @ApiOperation({ summary: 'Permissions that can be granted to organization roles, grouped by module' })
  @ApiOkResponse({ type: PermissionCatalogResponseDto })
  catalog(): PermissionCatalogResponseDto {
    return { data: this.roleManagementService.getPermissionCatalog() };
  }

  @Get(':id')
  @RequirePermissions('role.view')
  @ApiOperation({ summary: 'Get a role with its permissions' })
  @ApiOkResponse({ type: RoleDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Role not found' })
  async get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RoleDetailResponseDto> {
    return { data: await this.roleManagementService.getRole(user.organizationId, id) };
  }

  @Post()
  @RequirePermissions('role.create')
  @ApiOperation({ summary: 'Create a custom role' })
  @ApiCreatedResponse({ type: RoleDetailResponseDto })
  @ApiConflictResponse({ description: 'Role name already exists' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRoleDto,
    @Req() request: Request,
  ): Promise<RoleDetailResponseDto> {
    return {
      data: await this.roleManagementService.createRole(user, dto, {
        requestId: getRequestId(request),
      }),
    };
  }

  @Patch(':id')
  @RequirePermissions('role.update')
  @ApiOperation({ summary: 'Update a role name, description or permissions' })
  @ApiOkResponse({ type: RoleDetailResponseDto })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
    @Req() request: Request,
  ): Promise<RoleDetailResponseDto> {
    return {
      data: await this.roleManagementService.updateRole(user, id, dto, {
        requestId: getRequestId(request),
      }),
    };
  }

  @Post(':id/reset')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('role.update')
  @ApiOperation({ summary: 'Reset a built-in role to its default permissions' })
  @ApiOkResponse({ type: RoleDetailResponseDto })
  async reset(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request,
  ): Promise<RoleDetailResponseDto> {
    return {
      data: await this.roleManagementService.resetRole(user, id, {
        requestId: getRequestId(request),
      }),
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('role.delete')
  @ApiOperation({ summary: 'Delete a custom role that is not in use' })
  @ApiNoContentResponse()
  @ApiConflictResponse({ description: 'Role is assigned to users or used in a workflow' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request,
  ): Promise<void> {
    await this.roleManagementService.deleteRole(user, id, { requestId: getRequestId(request) });
  }
}
