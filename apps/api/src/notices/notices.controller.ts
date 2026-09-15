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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { PermissionsService } from '../permissions/permissions.service';
import { CreateNoticeDto, UpdateNoticeDto } from './dto/notice.dto';
import { ListNoticesQueryDto } from './dto/list-notices-query.dto';
import {
  NoticeResponseDto,
  PaginatedNoticesResponseDto,
} from './dto/notice-response.dto';
import { NoticesService } from './notices.service';

@ApiTags('notices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('notices')
export class NoticesController {
  constructor(
    private readonly noticesService: NoticesService,
    private readonly permissionsService: PermissionsService,
  ) {}

  private async canPublish(user: AuthenticatedUser): Promise<boolean> {
    const permissions = await this.permissionsService.getEffectivePermissions(
      user.userId,
      user.organizationId,
    );
    return permissions.includes('notice.publish');
  }

  @Get()
  @RequirePermissions('notice.view')
  @ApiOperation({ summary: 'List notices for the current organization' })
  @ApiOkResponse({ type: PaginatedNoticesResponseDto })
  async list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListNoticesQueryDto) {
    const canPublish = await this.canPublish(user);
    return this.noticesService.list(user.organizationId, user, query, canPublish);
  }

  @Post()
  @RequirePermissions('notice.create')
  @ApiOperation({ summary: 'Create a notice draft' })
  @ApiOkResponse({ type: NoticeResponseDto })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateNoticeDto) {
    const notice = await this.noticesService.create(user.organizationId, user, dto);
    return { data: this.noticesService.toDto(notice) };
  }

  @Get(':id')
  @RequirePermissions('notice.view')
  @ApiOperation({ summary: 'Get a notice by ID' })
  @ApiOkResponse({ type: NoticeResponseDto })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const canPublish = await this.canPublish(user);
    const notice = await this.noticesService.findById(user.organizationId, id, user, canPublish);
    return { data: this.noticesService.toDto(notice) };
  }

  @Patch(':id')
  @RequirePermissions('notice.create')
  @ApiOperation({ summary: 'Update a draft or scheduled notice' })
  @ApiOkResponse({ type: NoticeResponseDto })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNoticeDto,
  ) {
    const notice = await this.noticesService.update(user.organizationId, id, dto);
    return { data: this.noticesService.toDto(notice) };
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('notice.publish')
  @ApiOperation({ summary: 'Publish a notice' })
  @ApiOkResponse({ type: NoticeResponseDto })
  async publish(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const notice = await this.noticesService.publish(user.organizationId, id);
    return { data: this.noticesService.toDto(notice) };
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('notice.archive')
  @ApiOperation({ summary: 'Archive a published notice' })
  @ApiOkResponse({ type: NoticeResponseDto })
  async archive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const notice = await this.noticesService.archive(user.organizationId, id);
    return { data: this.noticesService.toDto(notice) };
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('notice.view')
  @ApiOperation({ summary: 'Mark a published notice as read' })
  @ApiOkResponse({ type: NoticeResponseDto })
  async markRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const notice = await this.noticesService.markRead(user.organizationId, id, user);
    return { data: this.noticesService.toDto(notice) };
  }

  @Post(':id/acknowledge')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('notice.view')
  @ApiOperation({ summary: 'Acknowledge a published notice' })
  @ApiOkResponse({ type: NoticeResponseDto })
  async acknowledge(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const notice = await this.noticesService.acknowledge(user.organizationId, id, user);
    return { data: this.noticesService.toDto(notice) };
  }
}
