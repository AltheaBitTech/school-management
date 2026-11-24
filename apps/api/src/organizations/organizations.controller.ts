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
import { UpdateDocumentSettingsDto } from './dto/update-document-settings.dto';
import { UpdateSchoolProfileDto } from './dto/update-school-profile.dto';
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
  @ApiOperation({ summary: 'Bootstrap an institution (school, college or institute) with its initial administrator' })
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

  @Get('current/profile')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('organization.settings.update')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'School profile used on documents and receipts' })
  async getSchoolProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.organizationsService.getSchoolProfile(user.organizationId);
  }

  @Patch('current/profile')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('organization.settings.update')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the school profile shown on documents' })
  async updateSchoolProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateSchoolProfileDto,
  ) {
    return this.organizationsService.updateSchoolProfile(user.organizationId, body);
  }

  @Get('current/document-settings')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('organization.settings.update')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ID card layout options for the current organization' })
  async getDocumentSettings(@CurrentUser() user: AuthenticatedUser) {
    return this.organizationsService.getDocumentSettings(user.organizationId);
  }

  @Patch('current/document-settings')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('organization.settings.update')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update ID card layout options' })
  async updateDocumentSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateDocumentSettingsDto,
  ) {
    return this.organizationsService.updateDocumentSettings(user.organizationId, body);
  }

  @Patch('current/logo')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('organization.settings.update')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set the organization logo from an uploaded image file' })
  async setLogo(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { fileId: string },
  ): Promise<OrganizationResponseDto> {
    const organization = await this.organizationsService.setLogo(user.organizationId, body.fileId);
    return { data: this.organizationsService.toOrganizationSummary(organization) };
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
