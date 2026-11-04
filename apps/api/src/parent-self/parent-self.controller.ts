import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { TransportService } from '../transport/transport.service';
import { ParentSelfService } from './parent-self.service';

class LinkParentDto {
  @IsUUID()
  parentUserId!: string;
}

class SearchParentCandidatesQueryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  search!: string;
}

@ApiTags('parent-self')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class ParentSelfController {
  constructor(
    private readonly parentSelfService: ParentSelfService,
    private readonly transportService: TransportService,
  ) {}

  @Get('parent-self/children')
  @RequirePermissions('parent.portal.view')
  @ApiOperation({ summary: 'List students linked to the authenticated parent' })
  listChildren(@CurrentUser() user: AuthenticatedUser) {
    return this.parentSelfService.listChildren(user);
  }

  @Get('parent-self/children/:studentId/transport')
  @RequirePermissions('student.self.transport.view')
  @ApiOperation({ summary: 'Current transport assignment for a linked child' })
  async childTransport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ) {
    await this.transportService.assertParentCanView(user.organizationId, user.userId, studentId);
    return this.transportService.currentForStudent(user.organizationId, studentId);
  }

  @Get('students/:studentId/parents')
  @RequirePermissions('student.view')
  @ApiOperation({ summary: 'List parent accounts linked to a student' })
  listLinkedParents(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ) {
    return this.parentSelfService.listLinkedParents(user.organizationId, studentId);
  }

  @Get('students/:studentId/parent-candidates')
  @RequirePermissions('parent.link.manage')
  @ApiOperation({ summary: 'Search PARENT accounts in this organization' })
  searchParentCandidates(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Query() query: SearchParentCandidatesQueryDto,
  ) {
    return this.parentSelfService.searchParentCandidates(
      user.organizationId,
      studentId,
      query.search,
    );
  }

  @Post('students/:studentId/parents')
  @RequirePermissions('parent.link.manage')
  @ApiOperation({ summary: 'Link a PARENT user to a student' })
  linkParent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Body() body: LinkParentDto,
  ) {
    return this.parentSelfService.linkParent(user.organizationId, studentId, body.parentUserId);
  }
}
