import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { AuditService } from './audit.service';
import { AuditLogListResponseDto } from './dto/audit-log-response.dto';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('audit-logs')
  @RequirePermissions('audit.view')
  @ApiOperation({ summary: 'List tenant-scoped audit logs for the current organization' })
  @ApiOkResponse({ type: AuditLogListResponseDto })
  async list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListAuditLogsQueryDto) {
    return this.auditService.list(user.organizationId, query);
  }
}
