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
import { ClassesService } from './classes.service';
import {
  ClassListResponseDto,
  ClassResponseDto,
  CreateClassDto,
  CreateSectionDto,
  ListClassesQueryDto,
  SectionResponseDto,
  UpdateClassDto,
  UpdateSectionDto,
} from './dto/class.dto';

@ApiTags('classes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Get('classes')
  @RequirePermissions('class.view')
  @ApiOperation({ summary: 'List classes with their sections' })
  @ApiOkResponse({ type: ClassListResponseDto })
  async list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListClassesQueryDto) {
    return { data: await this.classesService.listClasses(user.organizationId, query) };
  }

  @Get('classes/:id')
  @RequirePermissions('class.view')
  @ApiOperation({ summary: 'Get a class with its sections' })
  @ApiOkResponse({ type: ClassResponseDto })
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return { data: await this.classesService.getClass(user.organizationId, id) };
  }

  @Post('classes')
  @RequirePermissions('class.manage')
  @ApiOperation({ summary: 'Create a class' })
  @ApiOkResponse({ type: ClassResponseDto })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateClassDto) {
    return { data: await this.classesService.createClass(user.organizationId, dto) };
  }

  @Patch('classes/:id')
  @RequirePermissions('class.manage')
  @ApiOperation({ summary: 'Rename or reorder a class' })
  @ApiOkResponse({ type: ClassResponseDto })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClassDto,
  ) {
    return { data: await this.classesService.updateClass(user.organizationId, id, dto) };
  }

  @Post('classes/:id/deactivate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('class.manage')
  @ApiOperation({ summary: 'Deactivate a class and its sections' })
  @ApiOkResponse({ type: ClassResponseDto })
  async deactivate(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return { data: await this.classesService.deactivateClass(user.organizationId, id) };
  }

  @Post('classes/:id/activate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('class.manage')
  @ApiOperation({ summary: 'Reactivate a class' })
  @ApiOkResponse({ type: ClassResponseDto })
  async activate(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return { data: await this.classesService.activateClass(user.organizationId, id) };
  }

  @Post('classes/:id/sections')
  @RequirePermissions('class.manage')
  @ApiOperation({ summary: 'Add a section to a class' })
  @ApiOkResponse({ type: SectionResponseDto })
  async createSection(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateSectionDto,
  ) {
    return { data: await this.classesService.createSection(user.organizationId, id, dto) };
  }

  @Patch('sections/:id')
  @RequirePermissions('class.manage')
  @ApiOperation({ summary: 'Update a section (name, class teacher, capacity)' })
  @ApiOkResponse({ type: SectionResponseDto })
  async updateSection(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSectionDto,
  ) {
    return { data: await this.classesService.updateSection(user.organizationId, id, dto) };
  }

  @Post('sections/:id/deactivate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('class.manage')
  @ApiOperation({ summary: 'Deactivate a section' })
  @ApiOkResponse({ type: SectionResponseDto })
  async deactivateSection(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return { data: await this.classesService.deactivateSection(user.organizationId, id) };
  }

  @Post('sections/:id/activate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('class.manage')
  @ApiOperation({ summary: 'Reactivate a section' })
  @ApiOkResponse({ type: SectionResponseDto })
  async activateSection(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return { data: await this.classesService.activateSection(user.organizationId, id) };
  }
}
