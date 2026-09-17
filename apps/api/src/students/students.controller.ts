import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
import { CreateStudentDto } from './dto/create-student.dto';
import { ListStudentsQueryDto } from './dto/list-students-query.dto';
import {
  PaginatedStudentsResponseDto,
  StudentResponseDto,
} from './dto/student-response.dto';
import { StudentsService } from './students.service';

@ApiTags('students')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  @RequirePermissions('student.view')
  @ApiOperation({ summary: 'List students for the current organization' })
  @ApiOkResponse({ type: PaginatedStudentsResponseDto })
  async list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListStudentsQueryDto) {
    return this.studentsService.list(user.organizationId, query);
  }

  @Post()
  @RequirePermissions('student.create')
  @ApiOperation({ summary: 'Create a student' })
  @ApiOkResponse({ type: StudentResponseDto })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateStudentDto) {
    const student = await this.studentsService.create(user.organizationId, dto);
    return { data: this.studentsService.toDto(student) };
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
}
