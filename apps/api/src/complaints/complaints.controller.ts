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
    return this.complaintsService.list(user.organizationId, query);
  }

  @Post()
  @RequirePermissions('complaint.create')
  @ApiOperation({ summary: 'Create a complaint' })
  @ApiOkResponse({ type: ComplaintResponseDto })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateComplaintDto) {
    const complaint = await this.complaintsService.create(user.organizationId, user, dto);
    return { data: this.complaintsService.toDto(complaint) };
  }

  @Get(':id')
  @RequirePermissions('complaint.view')
  @ApiOperation({ summary: 'Get a complaint by ID' })
  @ApiOkResponse({ type: ComplaintResponseDto })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const complaint = await this.complaintsService.findById(user.organizationId, id);
    return { data: this.complaintsService.toDto(complaint) };
  }

  @Patch(':id')
  @RequirePermissions('complaint.update')
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
    const permissions = await this.permissionsService.getEffectivePermissions(
      user.userId,
      user.organizationId,
    );
    const canClose = permissions.includes('complaint.close');
    const complaint = await this.complaintsService.changeStatus(
      user.organizationId,
      id,
      user,
      dto,
      canClose,
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
    const complaint = await this.complaintsService.addComment(
      user.organizationId,
      id,
      user,
      dto,
    );
    return { data: this.complaintsService.toDto(complaint) };
  }
}
