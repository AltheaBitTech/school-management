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
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CreateVisitorDto } from './dto/visitor.dto';
import { ListVisitorsQueryDto } from './dto/list-visitors-query.dto';
import { LookupVisitorQueryDto } from './dto/lookup-visitor-query.dto';
import {
  PaginatedVisitorsResponseDto,
  VisitorHistoryResponseDto,
  VisitorResponseDto,
  VisitorStaffSummaryDto,
} from './dto/visitor-response.dto';
import { VisitorPassDetailResponseDto } from './dto/visitor-pass-response.dto';
import { VisitorsService } from './visitors.service';

@ApiTags('visitors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('visitors')
export class VisitorsController {
  constructor(private readonly visitorsService: VisitorsService) {}

  @Get()
  @RequirePermissions('visitor.view')
  @ApiOperation({ summary: 'List visitors for the current organization' })
  @ApiOkResponse({ type: PaginatedVisitorsResponseDto })
  async list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListVisitorsQueryDto) {
    return this.visitorsService.list(user.organizationId, query);
  }

  @Post()
  @RequirePermissions('visitor.create')
  @ApiOperation({ summary: 'Register and check in a visitor' })
  @ApiOkResponse({ type: VisitorResponseDto })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateVisitorDto) {
    const visitor = await this.visitorsService.create(user.organizationId, user, dto);
    return { data: this.visitorsService.toDto(visitor) };
  }

  @Get('host-staff')
  @RequirePermissions('visitor.create')
  @ApiOperation({ summary: 'List active staff who can host visitors (for check-in forms)' })
  @ApiOkResponse({ type: VisitorStaffSummaryDto, isArray: true })
  async listHostStaff(@CurrentUser() user: AuthenticatedUser) {
    const staff = await this.visitorsService.listActiveHostStaff(user.organizationId);
    return { data: staff };
  }

  @Get('lookup')
  @RequirePermissions('visitor.create')
  @ApiOperation({ summary: 'Look up the most recent visit for a mobile number (repeat visitor prefill)' })
  async lookup(@CurrentUser() user: AuthenticatedUser, @Query() query: LookupVisitorQueryDto) {
    const profile = await this.visitorsService.lookupByMobile(user.organizationId, query.mobile);
    return { data: profile };
  }

  @Get(':id/pass')
  @RequirePermissions('visitor.view')
  @ApiOperation({ summary: 'Get printable visitor pass data with QR code' })
  @ApiOkResponse({ type: VisitorPassDetailResponseDto })
  async pass(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const pass = await this.visitorsService.getVisitorPass(user.organizationId, id);
    return { data: pass };
  }

  @Get(':id/history')
  @RequirePermissions('visitor.view')
  @ApiOperation({ summary: 'Get visitor history' })
  @ApiOkResponse({ type: VisitorHistoryResponseDto })
  async history(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.visitorsService.listHistory(user.organizationId, id);
  }

  @Get(':id')
  @RequirePermissions('visitor.view')
  @ApiOperation({ summary: 'Get a visitor by ID' })
  @ApiOkResponse({ type: VisitorResponseDto })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const visitor = await this.visitorsService.findById(user.organizationId, id);
    return { data: this.visitorsService.toDto(visitor) };
  }

  @Post(':id/check-out')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('visitor.checkout')
  @ApiOperation({ summary: 'Check out a visitor' })
  @ApiOkResponse({ type: VisitorResponseDto })
  async checkOut(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const visitor = await this.visitorsService.checkOut(user.organizationId, id, user);
    return { data: this.visitorsService.toDto(visitor) };
  }
}
