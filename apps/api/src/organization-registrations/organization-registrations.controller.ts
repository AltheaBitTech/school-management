import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiCreatedResponse, ApiConflictResponse, ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { OrganizationRegistrationsService } from './organization-registrations.service';
import { CreateOrganizationRegistrationRequestDto } from './dto/create-organization-registration-request.dto';
import { OrganizationRegistrationResponseDto } from './dto/organization-registration-response.dto';
import { RejectOrganizationRegistrationDto } from './dto/reject-organization-registration.dto';
import { ApproveOrganizationRegistrationResponseDto } from './dto/approve-organization-registration-response.dto';
import { RegistrationSignupContextDto } from './dto/registration-signup-context.dto';
import { SuggestOrganizationCodeResponseDto } from './dto/suggest-organization-code-response.dto';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';

@ApiTags('public')
@Controller('public/organizations')
export class OrganizationRegistrationsController {
  constructor(private readonly registrationsService: OrganizationRegistrationsService) {}

  @Post('register')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 3600_000 } })
  @ApiOperation({ summary: 'Submit a new organization registration request' })
  @ApiCreatedResponse({ type: OrganizationRegistrationResponseDto })
  @ApiConflictResponse({ description: 'Email already registered or pending request exists' })
  async submitRegistrationRequest(
    @Body() dto: CreateOrganizationRegistrationRequestDto,
  ): Promise<OrganizationRegistrationResponseDto> {
    return this.registrationsService.submitRegistrationRequest(dto);
  }

  @Get('suggest-code')
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Suggest an available school login code from the school name' })
  @ApiOkResponse({ type: SuggestOrganizationCodeResponseDto })
  async suggestOrganizationCode(
    @Query('name') name: string,
    @Query('code') code?: string,
  ): Promise<SuggestOrganizationCodeResponseDto> {
    return this.registrationsService.suggestOrganizationCode(name ?? '', code);
  }

  @Get('register/:id/signup-context')
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Get approved registration signup context' })
  @ApiOkResponse({ type: RegistrationSignupContextDto })
  async getSignupContext(
    @Param('id', ParseUUIDPipe) registrationId: string,
  ): Promise<RegistrationSignupContextDto> {
    return this.registrationsService.getSignupContext(registrationId);
  }

  @Get('admin/requests')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('platform.organization.registration.view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all registration requests (platform admin only)' })
  async listRequests() {
    return this.registrationsService.findPending();
  }

  @Post('admin/requests/:id/approve')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('platform.organization.registration.approve')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a registration request (platform admin only)' })
  @ApiOkResponse({ type: ApproveOrganizationRegistrationResponseDto })
  async approveRequest(
    @Param('id', ParseUUIDPipe) registrationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApproveOrganizationRegistrationResponseDto> {
    return this.registrationsService.approveRegistration(registrationId, user.userId);
  }

  @Post('admin/requests/:id/reject')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('platform.organization.registration.reject')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a registration request (platform admin only)' })
  async rejectRequest(
    @Param('id', ParseUUIDPipe) registrationId: string,
    @Body() body: RejectOrganizationRegistrationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.registrationsService.rejectRegistration(registrationId, body.reason, user.userId);
  }
}
