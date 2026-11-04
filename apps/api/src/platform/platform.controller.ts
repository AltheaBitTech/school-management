import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SubscriptionStatus } from '@prisma/client';
import { IsEnum, IsString } from 'class-validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { PlatformService } from './platform.service';

export class UpdateSubscriptionDto {
  @IsString()
  planCode!: string;

  @IsEnum(SubscriptionStatus)
  status!: SubscriptionStatus;
}

@ApiTags('platform')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Get('platform/plans')
  @RequirePermissions('platform.organization.view')
  @ApiOperation({ summary: 'List subscription plans' })
  async listPlans() {
    const data = await this.platformService.listPlans();
    return { data };
  }

  @Get('platform/subscriptions')
  @RequirePermissions('platform.organization.view')
  async listSubscriptions() {
    const data = await this.platformService.listSubscriptions();
    return { data };
  }

  @Patch('platform/organizations/:organizationId/subscription')
  @RequirePermissions('platform.subscription.manage')
  async updateSubscription(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() body: UpdateSubscriptionDto,
  ) {
    const data = await this.platformService.updateSubscription(organizationId, body);
    return { data };
  }

  @Get('platform/analytics')
  @RequirePermissions('platform.organization.view')
  async analytics() {
    const data = await this.platformService.analytics();
    return { data };
  }

  @Get('organizations/current/subscription')
  async currentSubscription(@CurrentUser() user: AuthenticatedUser) {
    return this.platformService.currentForOrganization(user.organizationId);
  }
}
