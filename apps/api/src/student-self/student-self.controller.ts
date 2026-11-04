import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import {
  StudentSelfProfileResponseDto,
  StudentSelfFeesResponseDto,
} from './dto/student-self-response.dto';
import { StudentSelfService } from './student-self.service';

@ApiTags('student-self')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('student-self')
export class StudentSelfController {
  constructor(private readonly studentSelfService: StudentSelfService) {}

  @Get('profile')
  @RequirePermissions('student.self.view')
  @ApiOperation({ summary: 'View the authenticated student profile' })
  @ApiOkResponse({ type: StudentSelfProfileResponseDto })
  async getProfile(@CurrentUser() user: AuthenticatedUser): Promise<StudentSelfProfileResponseDto> {
    const data = await this.studentSelfService.getProfile(user);
    return { data };
  }

  @Get('transport')
  @RequirePermissions('student.self.transport.view')
  @ApiOperation({ summary: 'Current transport assignment for the authenticated student' })
  getTransport(@CurrentUser() user: AuthenticatedUser) {
    return this.studentSelfService.getTransport(user);
  }

  @Get('fees')
  @RequirePermissions('student.self.fee.view')
  @ApiOperation({ summary: 'List fee assignments for the authenticated student' })
  @ApiOkResponse({ type: StudentSelfFeesResponseDto })
  async listFees(@CurrentUser() user: AuthenticatedUser, @Query() query: PaginationQueryDto) {
    return this.studentSelfService.listFees(user, query);
  }

  @Get('fees/:studentFeeId/payments/:paymentId/receipt')
  @RequirePermissions('student.self.fee.receipt.download')
  @ApiOperation({ summary: 'Download a PDF receipt for an own fee payment' })
  async downloadReceipt(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentFeeId', ParseUUIDPipe) studentFeeId: string,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
  ) {
    return this.studentSelfService.downloadPaymentReceipt(user, studentFeeId, paymentId);
  }

  @Post('certificates/bonafide')
  @RequirePermissions('student.self.certificate.download')
  @ApiOperation({ summary: 'Generate a bonafide certificate for the authenticated student' })
  async generateBonafide(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { purpose?: string },
  ) {
    const document = await this.studentSelfService.generateBonafideCertificate(
      user,
      body.purpose,
    );
    return { data: document };
  }

  @Post('certificates/id-card')
  @RequirePermissions('student.self.certificate.download')
  @ApiOperation({ summary: 'Generate an ID card for the authenticated student' })
  async generateIdCard(@CurrentUser() user: AuthenticatedUser) {
    const document = await this.studentSelfService.generateIdCard(user);
    return { data: document };
  }
}
