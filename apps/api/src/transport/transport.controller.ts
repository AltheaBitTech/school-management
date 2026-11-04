import { Body, Controller, Get, Header, Param, ParseUUIDPipe, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { buildCsv } from '../reports/common/csv-export.util';
import {
  CreateTransportAssignmentDto,
  CreateTransportRouteDto,
  CreateTransportVehicleDto,
  EndTransportAssignmentDto,
  ReplaceTransportStopsDto,
  UpdateTransportRouteDto,
  UpdateTransportVehicleDto,
} from './dto/transport.dto';
import { TransportService } from './transport.service';

@ApiTags('transport')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('transport')
export class TransportController {
  constructor(private readonly transportService: TransportService) {}

  @Get('routes')
  @RequirePermissions('transport.view')
  @ApiOperation({ summary: 'List transport routes' })
  listRoutes(@CurrentUser() user: AuthenticatedUser) {
    return this.transportService.listRoutes(user.organizationId);
  }

  @Post('routes')
  @RequirePermissions('transport.manage')
  createRoute(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateTransportRouteDto) {
    return this.transportService.createRoute(user.organizationId, body).then((data) => ({ data }));
  }

  @Patch('routes/:id')
  @RequirePermissions('transport.manage')
  updateRoute(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateTransportRouteDto,
  ) {
    return this.transportService.updateRoute(user.organizationId, id, body).then((data) => ({ data }));
  }

  @Put('routes/:id/stops')
  @RequirePermissions('transport.manage')
  replaceStops(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ReplaceTransportStopsDto,
  ) {
    return this.transportService.replaceStops(user.organizationId, id, body.stops).then((data) => ({ data }));
  }

  @Get('vehicles')
  @RequirePermissions('transport.view')
  listVehicles(@CurrentUser() user: AuthenticatedUser) {
    return this.transportService.listVehicles(user.organizationId);
  }

  @Post('vehicles')
  @RequirePermissions('transport.manage')
  createVehicle(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateTransportVehicleDto) {
    return this.transportService.createVehicle(user.organizationId, body).then((data) => ({ data }));
  }

  @Patch('vehicles/:id')
  @RequirePermissions('transport.manage')
  updateVehicle(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateTransportVehicleDto,
  ) {
    return this.transportService.updateVehicle(user.organizationId, id, body).then((data) => ({ data }));
  }

  @Get('assignments')
  @RequirePermissions('transport.view')
  listAssignments(
    @CurrentUser() user: AuthenticatedUser,
    @Query('studentId') studentId?: string,
    @Query('routeId') routeId?: string,
  ) {
    return this.transportService.listAssignments(user.organizationId, { studentId, routeId });
  }

  @Post('assignments')
  @RequirePermissions('transport.assign')
  createAssignment(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateTransportAssignmentDto) {
    return this.transportService.createAssignment(user.organizationId, body).then((data) => ({ data }));
  }

  @Patch('assignments/:id')
  @RequirePermissions('transport.assign')
  endAssignment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: EndTransportAssignmentDto,
  ) {
    return this.transportService.endAssignment(user.organizationId, id, body.effectiveTo).then((data) => ({ data }));
  }
}

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('reports/transport')
export class TransportReportsController {
  constructor(private readonly transportService: TransportService) {}

  @Get('export.csv')
  @RequirePermissions('report.transport.view')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="transport-report.csv"')
  async exportCsv(@CurrentUser() user: AuthenticatedUser) {
    const rows = await this.transportService.reportRows(user.organizationId);
    return buildCsv(
      ['Student code', 'Name', 'Class', 'Route', 'Stop', 'Vehicle'],
      rows,
    );
  }
}
