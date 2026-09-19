import { Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import {
  NotificationListResponseDto,
  NotificationResponseDto,
} from './dto/notification-response.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('notifications')
  @ApiOperation({ summary: 'List notifications for the authenticated user' })
  @ApiOkResponse({ type: NotificationListResponseDto })
  async list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListNotificationsQueryDto) {
    return this.notificationsService.list(user.organizationId, user.userId, query);
  }

  @Post('notifications/:id/read')
  @ApiOperation({ summary: 'Mark a notification as read for the authenticated user' })
  @ApiOkResponse({ type: NotificationResponseDto })
  async markRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const notification = await this.notificationsService.markRead(
      user.organizationId,
      user.userId,
      id,
    );
    return { data: notification };
  }
}
