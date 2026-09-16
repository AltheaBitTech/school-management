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
import { AssetsService } from './assets.service';
import {
  AssignAssetDto,
  CreateAssetDto,
  RetireAssetDto,
  StartMaintenanceDto,
  TransferAssetDto,
  UpdateAssetDto,
} from './dto/asset.dto';
import {
  AssetCategoryListResponseDto,
  AssetHistoryResponseDto,
  AssetResponseDto,
  PaginatedAssetsResponseDto,
} from './dto/asset-response.dto';
import { ListAssetsQueryDto } from './dto/list-assets-query.dto';

@ApiTags('assets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get('categories')
  @RequirePermissions('asset.view')
  @ApiOperation({ summary: 'List asset categories for the current organization' })
  @ApiOkResponse({ type: AssetCategoryListResponseDto })
  async listCategories(@CurrentUser() user: AuthenticatedUser) {
    return this.assetsService.listCategories(user.organizationId);
  }

  @Get()
  @RequirePermissions('asset.view')
  @ApiOperation({ summary: 'List assets for the current organization' })
  @ApiOkResponse({ type: PaginatedAssetsResponseDto })
  async list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListAssetsQueryDto) {
    return this.assetsService.list(user.organizationId, query);
  }

  @Post()
  @RequirePermissions('asset.create')
  @ApiOperation({ summary: 'Register a new asset' })
  @ApiOkResponse({ type: AssetResponseDto })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAssetDto) {
    const asset = await this.assetsService.create(user.organizationId, user, dto);
    return { data: this.assetsService.toDto(asset) };
  }

  @Get(':id/history')
  @RequirePermissions('asset.view')
  @ApiOperation({ summary: 'Get asset history' })
  @ApiOkResponse({ type: AssetHistoryResponseDto })
  async history(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.assetsService.listHistory(user.organizationId, id);
  }

  @Get(':id')
  @RequirePermissions('asset.view')
  @ApiOperation({ summary: 'Get an asset by ID' })
  @ApiOkResponse({ type: AssetResponseDto })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const asset = await this.assetsService.findById(user.organizationId, id);
    return { data: this.assetsService.toDto(asset) };
  }

  @Patch(':id')
  @RequirePermissions('asset.update')
  @ApiOperation({ summary: 'Update asset metadata' })
  @ApiOkResponse({ type: AssetResponseDto })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssetDto,
  ) {
    const asset = await this.assetsService.update(user.organizationId, id, dto);
    return { data: this.assetsService.toDto(asset) };
  }

  @Post(':id/assign')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('asset.assign')
  @ApiOperation({ summary: 'Assign an asset to staff' })
  @ApiOkResponse({ type: AssetResponseDto })
  async assign(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignAssetDto,
  ) {
    const asset = await this.assetsService.assign(user.organizationId, id, user, dto);
    return { data: this.assetsService.toDto(asset) };
  }

  @Post(':id/unassign')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('asset.assign')
  @ApiOperation({ summary: 'Unassign an asset from staff' })
  @ApiOkResponse({ type: AssetResponseDto })
  async unassign(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const asset = await this.assetsService.unassign(user.organizationId, id, user);
    return { data: this.assetsService.toDto(asset) };
  }

  @Post(':id/transfer')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('asset.transfer')
  @ApiOperation({ summary: 'Transfer an asset' })
  @ApiOkResponse({ type: AssetResponseDto })
  async transfer(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransferAssetDto,
  ) {
    const asset = await this.assetsService.transfer(user.organizationId, id, user, dto);
    return { data: this.assetsService.toDto(asset) };
  }

  @Post(':id/maintenance/start')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('asset.maintenance')
  @ApiOperation({ summary: 'Start asset maintenance' })
  @ApiOkResponse({ type: AssetResponseDto })
  async startMaintenance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: StartMaintenanceDto,
  ) {
    const asset = await this.assetsService.startMaintenance(user.organizationId, id, user, dto);
    return { data: this.assetsService.toDto(asset) };
  }

  @Post(':id/maintenance/:maintenanceId/complete')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('asset.maintenance')
  @ApiOperation({ summary: 'Complete asset maintenance' })
  @ApiOkResponse({ type: AssetResponseDto })
  async completeMaintenance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('maintenanceId', ParseUUIDPipe) maintenanceId: string,
  ) {
    const asset = await this.assetsService.completeMaintenance(
      user.organizationId,
      id,
      maintenanceId,
      user,
    );
    return { data: this.assetsService.toDto(asset) };
  }

  @Post(':id/retire')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('asset.retire')
  @ApiOperation({ summary: 'Retire an asset' })
  @ApiOkResponse({ type: AssetResponseDto })
  async retire(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RetireAssetDto,
  ) {
    const asset = await this.assetsService.retire(user.organizationId, id, user, dto);
    return { data: this.assetsService.toDto(asset) };
  }
}
