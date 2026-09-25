import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { OnboardingStateResponseDto } from './dto/onboarding-state-response.dto';
import { UpdateOnboardingSetupDto } from './dto/update-onboarding-setup.dto';
import { OnboardingService } from './onboarding.service';

@ApiTags('onboarding')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('state')
  @RequirePermissions('organization.settings.update')
  @ApiOperation({ summary: 'Get onboarding state for the current organization' })
  @ApiOkResponse({ type: OnboardingStateResponseDto })
  async getState(@CurrentUser() user: AuthenticatedUser): Promise<OnboardingStateResponseDto> {
    const data = await this.onboardingService.getState(user.organizationId);
    return { data };
  }

  @Post('setup')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('organization.settings.update')
  @ApiOperation({ summary: 'Update organization setup during onboarding' })
  @ApiOkResponse({ type: OnboardingStateResponseDto })
  async updateSetup(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateOnboardingSetupDto,
  ): Promise<OnboardingStateResponseDto> {
    const data = await this.onboardingService.updateSetup(user.organizationId, dto);
    return { data };
  }

  @Post('finish')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('organization.settings.update')
  @ApiOperation({ summary: 'Mark onboarding as completed for the current organization' })
  @ApiOkResponse({ type: OnboardingStateResponseDto })
  async finish(@CurrentUser() user: AuthenticatedUser): Promise<OnboardingStateResponseDto> {
    const data = await this.onboardingService.finish(user.organizationId);
    return { data };
  }
}
