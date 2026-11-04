import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApprovalEntityType } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { OperationalRequestsService } from './operational-requests.service';

class CreateOperationalRequestDto {
  @IsEnum(ApprovalEntityType)
  requestType!: ApprovalEntityType;

  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  description!: string;

  @IsOptional()
  @IsNumber()
  amount?: number;
}

@ApiTags('operational-requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('operational-requests')
export class OperationalRequestsController {
  constructor(private readonly operationalRequestsService: OperationalRequestsService) {}

  @Get()
  @RequirePermissions('approval.view')
  @ApiOperation({ summary: 'List maintenance, purchase, and budget requests' })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.operationalRequestsService.list(user.organizationId);
  }

  @Post()
  @RequirePermissions('approval.submit')
  @ApiOperation({ summary: 'Submit a maintenance, purchase, or budget request for approval' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateOperationalRequestDto) {
    return this.operationalRequestsService.create(user, body);
  }
}
