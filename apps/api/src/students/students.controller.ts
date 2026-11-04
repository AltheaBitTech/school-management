import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  UseFilters,
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
import type { Request, Response } from 'express';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CreateStudentDto } from './dto/create-student.dto';
import { ListStudentsQueryDto } from './dto/list-students-query.dto';
import {
  PaginatedStudentsResponseDto,
  StudentResponseDto,
} from './dto/student-response.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { ProvisionStudentLoginDto } from './dto/provision-student-login.dto';
import { StudentImportResponseDto } from './dto/student-import-response.dto';
import { StudentImportService } from './student-import.service';
import { StudentLoginProvisioningService } from './student-login-provisioning.service';
import { StudentsService } from './students.service';
import { getRequestId } from '../common/middleware/correlation-id.middleware';

@ApiTags('students')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('students')
export class StudentsController {
  constructor(
    private readonly studentsService: StudentsService,
    private readonly studentImportService: StudentImportService,
    private readonly studentLoginProvisioningService: StudentLoginProvisioningService,
  ) {}

  @Get()
  @RequirePermissions('student.view')
  @ApiOperation({ summary: 'List students for the current organization' })
  @ApiOkResponse({ type: PaginatedStudentsResponseDto })
  async list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListStudentsQueryDto) {
    return this.studentsService.list(user.organizationId, query);
  }

  @Get('next-code')
  @RequirePermissions('student.create')
  @ApiOperation({ summary: 'Suggest the next student admission code for this organization' })
  async suggestNextStudentCode(@CurrentUser() user: AuthenticatedUser) {
    const code = await this.studentsService.suggestNextStudentCode(user.organizationId);
    return { data: { code } };
  }

  @Post()
  @RequirePermissions('student.create')
  @ApiOperation({ summary: 'Create a student' })
  @ApiOkResponse({ type: StudentResponseDto })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateStudentDto) {
    const student = await this.studentsService.create(user.organizationId, dto);
    return { data: this.studentsService.toDto(student) };
  }

  @Get('import/sample.csv')
  @RequirePermissions('student.create')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="campusops-students-import-sample.csv"')
  @ApiOperation({ summary: 'Download sample CSV for bulk student import' })
  sampleCsv(@Res() res: Response): void {
    res.send(this.studentImportService.getSampleCsv());
  }

  @Get('import/guide.pdf')
  @RequirePermissions('student.create')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="campusops-student-import-guide.pdf"')
  @ApiOperation({ summary: 'Download the student CSV import guide' })
  async importGuide(@Res() res: Response): Promise<void> {
    res.send(await this.studentImportService.getGuidePdf());
  }

  @Post('import/preview')
  @RequirePermissions('student.create')
  @UseFilters(CsvUploadExceptionFilter)
  @UseInterceptors(
    FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_IMPORT_BYTES } }),
  )
  @ApiOperation({ summary: 'Validate a student CSV without saving rows' })
  previewStudents(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.studentImportService.previewFromCsv(user, file);
  }

  @Post('import')
  @RequirePermissions('student.create')
  @UseFilters(CsvUploadExceptionFilter)
  @UseInterceptors(
    FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_IMPORT_BYTES } }),
  )
  @ApiOperation({ summary: 'Import students from CSV (create-only)' })
  @ApiOkResponse({ type: StudentImportResponseDto })
  async importStudents(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
    @Req() request: Request,
  ): Promise<StudentImportResponseDto> {
    return this.studentImportService.importFromCsv(user, file, {
      requestId: getRequestId(request),
    });
  }

  @Post(':id/provision-login')
  @RequirePermissions('user.create', 'role.assign')
  @ApiOperation({ summary: 'Provision a STUDENT login linked to this student' })
  async provisionLogin(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProvisionStudentLoginDto,
    @Req() request: Request,
  ) {
    const result = await this.studentLoginProvisioningService.provisionLogin(user, id, dto, {
      requestId: getRequestId(request),
    });
    return { data: result };
  }

  @Get(':id')
  @RequirePermissions('student.view')
  @ApiOperation({ summary: 'Get a student by ID' })
  @ApiOkResponse({ type: StudentResponseDto })
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const student = await this.studentsService.findById(user.organizationId, id);
    return { data: this.studentsService.toDto(student) };
  }

  @Patch(':id')
  @RequirePermissions('student.update')
  @ApiOperation({ summary: 'Update a student' })
  @ApiOkResponse({ type: StudentResponseDto })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudentDto,
  ) {
    const student = await this.studentsService.update(user.organizationId, id, dto);
    return { data: this.studentsService.toDto(student) };
  }
}
