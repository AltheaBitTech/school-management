import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiCreatedResponse, ApiConflictResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { OrganizationRegistrationsService } from './organization-registrations.service';
import { CreateOrganizationRegistrationRequestDto } from './dto/create-organization-registration-request.dto';
import { OrganizationRegistrationResponseDto } from './dto/organization-registration-response.dto';
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

  @Get('admin/requests')
  @UseGuards(JwtAuthGuard)
  @RequirePermissions('platform.organization.registration.view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all registration requests (platform admin only)' })
  async listRequests() {
    return this.registrationsService.findPending();
  }

  @Post('admin/requests/:id/approve')
  @UseGuards(JwtAuthGuard)
  @RequirePermissions('platform.organization.registration.approve')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a registration request (platform admin only)' })
  async approveRequest(
    @Param('id') registrationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.registrationsService.approveRegistration(registrationId, user.userId);
  }

  @Post('admin/requests/:id/reject')
  @UseGuards(JwtAuthGuard)
  @RequirePermissions('platform.organization.registration.reject')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a registration request (platform admin only)' })
  async rejectRequest(
    @Param('id') registrationId: string,
    @Body() body: { reason: string },
  ) {
    return this.registrationsService.rejectRegistration(registrationId, body.reason);
  }
}
