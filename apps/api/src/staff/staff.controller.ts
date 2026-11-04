import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  UseFilters,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CsvUploadExceptionFilter, MAX_IMPORT_BYTES } from '../common/utils/csv-import.util';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { getRequestId } from '../common/middleware/correlation-id.middleware';
import { CreateStaffDto } from './dto/create-staff.dto';
import { ListStaffQueryDto } from './dto/list-staff-query.dto';
import {
  PaginatedStaffResponseDto,
  StaffResponseDto,
} from './dto/staff-response.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { ProvisionStaffLoginDto } from './dto/provision-staff-login.dto';
import { ProvisionStaffLoginResponseDto } from './dto/provision-staff-login-response.dto';
import { StaffImportResponseDto } from './dto/staff-import-response.dto';
import { StaffLoginProvisioningService } from './staff-login-provisioning.service';
import { StaffImportService } from './staff-import.service';
import { AttendanceService } from '../attendance/attendance.service';
import { StaffService } from './staff.service';
import { Request, Response } from 'express';

@ApiTags('staff')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('staff')
export class StaffController {
  constructor(
    private readonly staffService: StaffService,
    private readonly staffLoginProvisioningService: StaffLoginProvisioningService,
    private readonly staffImportService: StaffImportService,
    private readonly attendanceService: AttendanceService,
  ) {}

  @Get()
  @RequirePermissions('staff.view')
  @ApiOperation({ summary: 'List staff for the current organization' })
  @ApiOkResponse({ type: PaginatedStaffResponseDto })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListStaffQueryDto,
  ) {
    return this.staffService.list(user.organizationId, query);
  }

  @Get('import/sample.csv')
  @RequirePermissions('staff.create')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="campusops-staff-import-sample.csv"')
  @ApiOperation({ summary: 'Download sample CSV for bulk staff import' })
  sampleCsv(@Res() res: Response): void {
    res.send(this.staffImportService.getSampleCsv());
  }

  @Get('import/guide.pdf')
  @RequirePermissions('staff.create')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="campusops-staff-import-guide.pdf"')
  @ApiOperation({ summary: 'Download the staff CSV import guide' })
  async importGuide(@Res() res: Response): Promise<void> {
    res.send(await this.staffImportService.getGuidePdf());
  }

  @Post('import/preview')
  @RequirePermissions('staff.create', 'role.assign')
  @UseFilters(CsvUploadExceptionFilter)
  @UseInterceptors(
    FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_IMPORT_BYTES } }),
  )
  @ApiOperation({ summary: 'Validate a staff CSV without saving rows' })
  previewStaff(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.staffImportService.previewFromCsv(user, file);
  }

  @Post('import')
  @RequirePermissions('staff.create', 'role.assign')
  @UseFilters(CsvUploadExceptionFilter)
  @UseInterceptors(
    FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_IMPORT_BYTES } }),
  )
  @ApiOperation({ summary: 'Import staff from CSV and send login invites' })
  @ApiOkResponse({ type: StaffImportResponseDto })
  async importStaff(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
    @Req() request: Request,
  ): Promise<StaffImportResponseDto> {
    return this.staffImportService.importFromCsv(user, file, {
      requestId: getRequestId(request),
    });
  }

  @Get('next-code')
  @RequirePermissions('staff.create')
  @ApiOperation({ summary: 'Suggest the next employee code for this organization' })
  async suggestNextEmployeeCode(@CurrentUser() user: AuthenticatedUser) {
    const code = await this.staffService.suggestNextEmployeeCode(user.organizationId);
    return { data: { code } };
  }

  @Post()
  @RequirePermissions('staff.create')
  @ApiOperation({ summary: 'Create a staff member' })
  @ApiOkResponse({ type: StaffResponseDto })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateStaffDto,
  ) {
    const staff = await this.staffService.create(user.organizationId, dto);
    return { data: this.staffService.toDto(staff) };
  }

  @Get(':id/attendance-qr')
  @RequirePermissions('attendance.view')
  @ApiOperation({ summary: 'QR code a marker can scan to check this staff member in or out' })
  async attendanceQr(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.attendanceService.issueQr(user.organizationId, id);
    return { data };
  }

  @Get(':id')
  @RequirePermissions('staff.view')
  @ApiOperation({ summary: 'Get a staff member by ID' })
  @ApiOkResponse({ type: StaffResponseDto })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const staff = await this.staffService.findById(user.organizationId, id);
    return { data: await this.staffService.toDtoWithLoginRole(staff, user.organizationId) };
  }

  @Patch(':id')
  @RequirePermissions('staff.update')
  @ApiOperation({ summary: 'Update a staff member' })
  @ApiOkResponse({ type: StaffResponseDto })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStaffDto,
  ) {
    const staff = await this.staffService.update(user.organizationId, id, dto);
    return { data: this.staffService.toDto(staff) };
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('staff.deactivate')
  @ApiOperation({ summary: 'Deactivate a staff member' })
  @ApiOkResponse({ type: StaffResponseDto })
  async deactivate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const staff = await this.staffService.deactivate(user.organizationId, id);
    return { data: this.staffService.toDto(staff) };
  }

  @Post(':id/provision-login')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('user.create', 'role.assign')
  @ApiOperation({ summary: 'Provision a login account for an existing staff member' })
  @ApiOkResponse({ type: ProvisionStaffLoginResponseDto })
  async provisionLogin(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProvisionStaffLoginDto,
    @Req() request: Request,
  ): Promise<ProvisionStaffLoginResponseDto> {
    const result = await this.staffLoginProvisioningService.provisionLogin(
      user,
      id,
      dto,
      { requestId: getRequestId(request) },
    );

    return {
      data: {
        staff: await this.staffService.toDtoWithLoginRole(result.staff, user.organizationId),
        loginEmail: result.loginEmail,
        inviteUrl: result.inviteUrl,
        inviteExpiresAt: result.inviteExpiresAt,
      },
    };
  }
}
