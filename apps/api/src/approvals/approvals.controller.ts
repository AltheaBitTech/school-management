import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { getRequestId } from '../common/middleware/correlation-id.middleware';
import { ApprovalActionsService } from './approval-actions.service';
import { ApprovalRequestsService } from './approval-requests.service';
import { ApprovalWorkflowsService } from './approval-workflows.service';
import {
  ApprovalDecisionDto,
  CreateApprovalWorkflowDto,
  ListApprovalRequestsQueryDto,
  UpdateApprovalWorkflowDto,
} from './dto/approval.dto';
import {
  ApprovalHistoryResponseDto,
  ApprovalRequestResponseDto,
  ApprovalWorkflowResponseDto,
  PaginatedApprovalRequestsResponseDto,
  PaginatedApprovalWorkflowsResponseDto,
} from './dto/approval-response.dto';
import { Request } from 'express';

@ApiTags('approvals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('approvals')
export class ApprovalsController {
  constructor(
    private readonly approvalRequestsService: ApprovalRequestsService,
    private readonly approvalActionsService: ApprovalActionsService,
  ) {}

  @Get()
  @RequirePermissions('approval.view')
  @ApiOperation({ summary: 'List approval requests for the current organization' })
  @ApiOkResponse({ type: PaginatedApprovalRequestsResponseDto })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListApprovalRequestsQueryDto,
  ) {
    return this.approvalRequestsService.list(user.organizationId, query);
  }

  @Get(':id')
  @RequirePermissions('approval.view')
  @ApiOperation({ summary: 'Get an approval request by ID' })
  @ApiOkResponse({ type: ApprovalRequestResponseDto })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const request = await this.approvalRequestsService.findById(user.organizationId, id);
    return { data: await this.approvalRequestsService.toDto(request) };
  }

  @Get(':id/history')
  @RequirePermissions('approval.view')
  @ApiOperation({ summary: 'Get approval history for a request' })
  @ApiOkResponse({ type: ApprovalHistoryResponseDto })
  async history(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const actions = await this.approvalRequestsService.getHistory(user.organizationId, id);
    return {
      data: actions.map((action) => this.approvalRequestsService.actionToDto(action)),
    };
  }

  @Post(':id/approve')
  @RequirePermissions('approval.approve')
  @ApiOperation({ summary: 'Approve the current level of an approval request' })
  @ApiOkResponse({ type: ApprovalRequestResponseDto })
  async approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApprovalDecisionDto,
    @Req() request: Request,
  ) {
    const approvalRequest = await this.approvalActionsService.approve(
      user.organizationId,
      id,
      user,
      dto,
      { requestId: getRequestId(request) },
    );
    const loaded = await this.approvalRequestsService.findById(user.organizationId, approvalRequest.id);
    return { data: await this.approvalRequestsService.toDto(loaded) };
  }

  @Post(':id/reject')
  @RequirePermissions('approval.reject')
  @ApiOperation({ summary: 'Reject an approval request' })
  @ApiOkResponse({ type: ApprovalRequestResponseDto })
  async reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApprovalDecisionDto,
    @Req() request: Request,
  ) {
    const approvalRequest = await this.approvalActionsService.reject(
      user.organizationId,
      id,
      user,
      dto,
      { requestId: getRequestId(request) },
    );
    const loaded = await this.approvalRequestsService.findById(user.organizationId, approvalRequest.id);
    return { data: await this.approvalRequestsService.toDto(loaded) };
  }
}

@ApiTags('approval-workflows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('approval-workflows')
export class ApprovalWorkflowsController {
  constructor(private readonly approvalWorkflowsService: ApprovalWorkflowsService) {}

  @Get()
  @RequirePermissions('approval.view')
  @ApiOperation({ summary: 'List approval workflows for the current organization' })
  @ApiOkResponse({ type: PaginatedApprovalWorkflowsResponseDto })
  async list(@CurrentUser() user: AuthenticatedUser, @Query() query: PaginationQueryDto) {
    return this.approvalWorkflowsService.list(user.organizationId, query);
  }

  @Post()
  @RequirePermissions('approval.configure')
  @ApiOperation({ summary: 'Create an approval workflow' })
  @ApiOkResponse({ type: ApprovalWorkflowResponseDto })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateApprovalWorkflowDto) {
    const workflow = await this.approvalWorkflowsService.create(user.organizationId, dto);
    return { data: this.approvalWorkflowsService.toDto(workflow) };
  }

  @Get(':id')
  @RequirePermissions('approval.view')
  @ApiOperation({ summary: 'Get an approval workflow by ID' })
  @ApiOkResponse({ type: ApprovalWorkflowResponseDto })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const workflow = await this.approvalWorkflowsService.findById(user.organizationId, id);
    return { data: this.approvalWorkflowsService.toDto(workflow) };
  }

  @Patch(':id')
  @RequirePermissions('approval.configure')
  @ApiOperation({ summary: 'Update an approval workflow' })
  @ApiOkResponse({ type: ApprovalWorkflowResponseDto })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApprovalWorkflowDto,
  ) {
    const workflow = await this.approvalWorkflowsService.update(user.organizationId, id, dto);
    return { data: this.approvalWorkflowsService.toDto(workflow) };
  }
}
