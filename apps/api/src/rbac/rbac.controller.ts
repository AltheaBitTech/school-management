import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RolesService } from '../roles/roles.service';
import { AssignRoleDto } from '../roles/dto/assign-role.dto';
import { getRequestId } from '../common/middleware/correlation-id.middleware';
import { Request } from 'express';

class RbacTestDataDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  organizationId!: string;
}

class RbacTestResponseDto {
  @ApiProperty({ type: RbacTestDataDto })
  data!: RbacTestDataDto;
}

@ApiTags('rbac')
@Controller('rbac')
export class RbacController {
  constructor(private readonly rolesService: RolesService) {}

  @Post('users/:userId/roles')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign a role to a user within tenant-safe rules' })
  @ApiUnauthorizedResponse({ description: 'Unauthenticated' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async assignRole(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() assignRoleDto: AssignRoleDto,
    @Req() request: Request,
  ): Promise<void> {
    await this.rolesService.assignRoleToUser(actor, userId, assignRoleDto.roleId, {
      requestId: getRequestId(request),
    });
  }
}

@ApiTags('auth')
@Controller('auth')
export class AuthRbacTestController {
  @Get('rbac-test')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('staff.view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Authorization foundation test endpoint' })
  @ApiOkResponse({ type: RbacTestResponseDto })
  @ApiUnauthorizedResponse({ description: 'Unauthenticated' })
  @ApiForbiddenResponse({ description: 'Missing required permission' })
  rbacTest(@CurrentUser() user: AuthenticatedUser): RbacTestResponseDto {
    return {
      data: {
        userId: user.userId,
        organizationId: user.organizationId,
      },
    };
  }
}
