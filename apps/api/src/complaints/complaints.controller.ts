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
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { PermissionsService } from '../permissions/permissions.service';
import { buildContentDispositionFilename } from '../files/utils/filename.util';
import { ComplaintsService } from './complaints.service';
import {
  AddComplaintCommentDto,
  AssignComplaintDto,
  ChangeComplaintStatusDto,
  CreateComplaintDto,
  UpdateComplaintDto,
} from './dto/complaint.dto';
import {
  ComplaintResponseDto,
  PaginatedComplaintsResponseDto,
} from './dto/complaint-response.dto';
import { ListComplaintsQueryDto } from './dto/list-complaints-query.dto';

@ApiTags('complaints')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('complaints')
export class ComplaintsController {
  constructor(
    private readonly complaintsService: ComplaintsService,
    private readonly permissionsService: PermissionsService,
  ) {}

  @Get()
  @RequirePermissions('complaint.view')
  @ApiOperation({ summary: 'List complaints for the current organization' })
  @ApiOkResponse({ type: PaginatedComplaintsResponseDto })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListComplaintsQueryDto,
  ) {
    const scope = await this.readScope(user);
    return this.complaintsService.list(user.organizationId, query, scope);
  }

  @Post()
  @RequirePermissions('complaint.create')
  @ApiOperation({ summary: 'Create a complaint' })
  @ApiOkResponse({ type: ComplaintResponseDto })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateComplaintDto) {
    const complaint = await this.complaintsService.create(user.organizationId, user, dto);
    return { data: this.complaintsService.toDto(complaint) };
  }

  @Get(':id/attachments/:fileId')
  @RequirePermissions('complaint.view')
  @ApiOperation({ summary: 'Download a complaint attachment (complaint-scoped authorization)' })
  async downloadAttachment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('fileId', ParseUUIDPipe) fileId: string,
  ): Promise<StreamableFile> {
    const scope = await this.readScope(user);
    const { file, buffer } = await this.complaintsService.downloadAttachment(
      user.organizationId,
      id,
      fileId,
      scope,
    );

    return new StreamableFile(buffer, {
      type: file.mimeType,
      disposition: buildContentDispositionFilename(file.originalName),
      length: file.size,
    });
  }

  @Get(':id')
  @RequirePermissions('complaint.view')
  @ApiOperation({ summary: 'Get a complaint by ID' })
  @ApiOkResponse({ type: ComplaintResponseDto })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const scope = await this.readScope(user);
    const complaint = await this.complaintsService.findById(user.organizationId, id, scope);
    return { data: this.complaintsService.toDto(complaint) };
  }

  @Patch(':id')
  @RequirePermissions('complaint.update', 'complaint.assign')
  @ApiOperation({ summary: 'Update complaint details' })
  @ApiOkResponse({ type: ComplaintResponseDto })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateComplaintDto,
  ) {
    const complaint = await this.complaintsService.update(user.organizationId, id, dto);
    return { data: this.complaintsService.toDto(complaint) };
  }

  @Post(':id/assign')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('complaint.assign')
  @ApiOperation({ summary: 'Assign a complaint to staff' })
  @ApiOkResponse({ type: ComplaintResponseDto })
  async assign(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignComplaintDto,
  ) {
    const complaint = await this.complaintsService.assign(user.organizationId, id, user, dto);
    return { data: this.complaintsService.toDto(complaint) };
  }

  @Post(':id/status')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('complaint.update')
  @ApiOperation({ summary: 'Change complaint status' })
  @ApiOkResponse({ type: ComplaintResponseDto })
  async changeStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeComplaintStatusDto,
  ) {
    const permissions =
      (await this.permissionsService.getEffectivePermissions(
        user.userId,
        user.organizationId,
        user.activeRoleId ?? '',
      )) ?? [];
    const canClose = permissions.includes('complaint.close');
    const scope = await this.complaintsService.resolveReadScope(user, permissions);
    const complaint = await this.complaintsService.changeStatus(
      user.organizationId,
      id,
      user,
      dto,
      canClose,
      scope,
    );
    return { data: this.complaintsService.toDto(complaint) };
  }

  @Post(':id/comments')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('complaint.update')
  @ApiOperation({ summary: 'Add a comment to a complaint' })
  @ApiOkResponse({ type: ComplaintResponseDto })
  async addComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddComplaintCommentDto,
  ) {
    const scope = await this.readScope(user);
    const complaint = await this.complaintsService.addComment(
      user.organizationId,
      id,
      user,
      dto,
      scope,
    );
    return { data: this.complaintsService.toDto(complaint) };
  }

  private async readScope(user: AuthenticatedUser) {
    const permissions =
      (await this.permissionsService.getEffectivePermissions(
        user.userId,
        user.organizationId,
        user.activeRoleId ?? '',
      )) ?? [];
    return this.complaintsService.resolveReadScope(user, permissions);
  }
}
