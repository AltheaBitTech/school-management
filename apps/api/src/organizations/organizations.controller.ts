import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import {
  OrganizationBootstrapResponseDto,
  OrganizationResponseDto,
} from './dto/organization-response.dto';
import { OrganizationsService } from './organizations.service';

@ApiTags('organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('platform.organization.create')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bootstrap a school organization with its initial administrator' })
  @ApiCreatedResponse({ type: OrganizationBootstrapResponseDto })
  @ApiUnauthorizedResponse({ description: 'Unauthenticated' })
  @ApiForbiddenResponse({ description: 'Platform authorization required' })
  @ApiConflictResponse({ description: 'Duplicate organization code or admin email' })
  async bootstrapOrganization(
    @Body() createOrganizationDto: CreateOrganizationDto,
  ): Promise<OrganizationBootstrapResponseDto> {
    const result = await this.organizationsService.bootstrapOrganization(createOrganizationDto);

    return {
      data: {
        organization: this.organizationsService.toOrganizationSummary(result.organization),
        admin: result.admin,
      },
    };
  }

  @Get('current')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the authenticated user organization' })
  @ApiOkResponse({ type: OrganizationResponseDto })
  async getCurrentOrganization(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrganizationResponseDto> {
    const organization = await this.organizationsService.getOrganizationForAuthenticatedUser(
      user.organizationId,
    );

    return {
      data: this.organizationsService.toOrganizationSummary(organization),
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('platform.organization.view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get an organization by ID (platform scope)' })
  @ApiOkResponse({ type: OrganizationResponseDto })
  @ApiForbiddenResponse({ description: 'Platform authorization required' })
  async getOrganizationById(
    @Param('id', ParseUUIDPipe) organizationId: string,
  ): Promise<OrganizationResponseDto> {
    const organization = await this.organizationsService.getOrganizationById(organizationId);

    return {
      data: this.organizationsService.toOrganizationSummary(organization),
    };
  }
}
