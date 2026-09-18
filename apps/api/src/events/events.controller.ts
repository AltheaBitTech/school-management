import {
  Body,
  Controller,
  Delete,
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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { EventsService } from './events.service';
import {
  CreateEventDto,
  CreateEventParticipantDto,
  CreateVenueDto,
  UpdateEventDto,
  UpdateVenueDto,
} from './dto/event.dto';
import { ListEventsQueryDto, ListVenuesQueryDto } from './dto/list-events-query.dto';

@ApiTags('events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get('events')
  @RequirePermissions('event.view')
  @ApiOperation({ summary: 'List events for the current organization' })
  async listEvents(@CurrentUser() user: AuthenticatedUser, @Query() query: ListEventsQueryDto) {
    return this.eventsService.list(user.organizationId, query);
  }

  @Post('events')
  @RequirePermissions('event.create')
  @ApiOperation({ summary: 'Create an event' })
  async createEvent(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateEventDto) {
    const event = await this.eventsService.create(user.organizationId, user, dto);
    return { data: this.eventsService.toDto(event) };
  }

  @Get('events/:id')
  @RequirePermissions('event.view')
  async getEvent(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    const event = await this.eventsService.findById(user.organizationId, id);
    return { data: this.eventsService.toDto(event) };
  }

  @Patch('events/:id')
  @RequirePermissions('event.update')
  async updateEvent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEventDto,
  ) {
    const event = await this.eventsService.update(user.organizationId, id, dto);
    return { data: this.eventsService.toDto(event) };
  }

  @Post('events/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('event.cancel')
  async cancelEvent(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    const event = await this.eventsService.cancel(user.organizationId, id);
    return { data: this.eventsService.toDto(event) };
  }

  @Post('events/:id/schedule')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('event.update')
  async scheduleEvent(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    const event = await this.eventsService.schedule(user.organizationId, id);
    return { data: this.eventsService.toDto(event) };
  }

  @Post('events/:id/complete')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('event.complete')
  async completeEvent(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    const event = await this.eventsService.complete(user.organizationId, id);
    return { data: this.eventsService.toDto(event) };
  }

  @Post('events/:id/archive')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('event.archive')
  async archiveEvent(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    const event = await this.eventsService.archive(user.organizationId, id);
    return { data: this.eventsService.toDto(event) };
  }

  @Get('venues')
  @RequirePermissions('event.view')
  async listVenues(@CurrentUser() user: AuthenticatedUser, @Query() query: ListVenuesQueryDto) {
    return this.eventsService.listVenues(user.organizationId, query);
  }

  @Post('venues')
  @RequirePermissions('event.manage_venues')
  async createVenue(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateVenueDto) {
    return { data: await this.eventsService.createVenue(user.organizationId, dto) };
  }

  @Get('venues/:id')
  @RequirePermissions('event.view')
  async getVenue(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return { data: await this.eventsService.getVenue(user.organizationId, id) };
  }

  @Patch('venues/:id')
  @RequirePermissions('event.manage_venues')
  async updateVenue(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVenueDto,
  ) {
    return { data: await this.eventsService.updateVenue(user.organizationId, id, dto) };
  }

  @Get('events/:id/participants')
  @RequirePermissions('event.view')
  async listParticipants(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.listParticipants(user.organizationId, id);
  }

  @Post('events/:id/participants')
  @RequirePermissions('event.manage_participants')
  async addParticipant(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateEventParticipantDto,
  ) {
    return { data: await this.eventsService.addParticipant(user.organizationId, id, dto) };
  }

  @Delete('events/:id/participants/:participantId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('event.manage_participants')
  async removeParticipant(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('participantId', ParseUUIDPipe) participantId: string,
  ) {
    return this.eventsService.removeParticipant(user.organizationId, id, participantId);
  }
}
