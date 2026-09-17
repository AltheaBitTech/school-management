import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
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
import { DocumentsService } from './documents.service';
import {
  GeneratedDocumentDetailResponseDto,
  PaginatedGeneratedDocumentsResponseDto,
} from './dto/document-response.dto';
import { GenerateBonafideDocumentDto } from './dto/generate-bonafide-document.dto';
import { ListDocumentsQueryDto } from './dto/list-documents-query.dto';

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @RequirePermissions('document.view')
  @ApiOperation({ summary: 'List generated documents for the current organization' })
  @ApiOkResponse({ type: PaginatedGeneratedDocumentsResponseDto })
  async list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListDocumentsQueryDto) {
    return this.documentsService.list(user.organizationId, query);
  }

  @Post('bonafide')
  @RequirePermissions('document.generate')
  @ApiOperation({ summary: 'Generate a bonafide certificate for a student' })
  @ApiOkResponse({ type: GeneratedDocumentDetailResponseDto })
  async generateBonafide(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GenerateBonafideDocumentDto,
  ) {
    const document = await this.documentsService.generateBonafide(
      user.organizationId,
      user,
      dto.studentId,
    );
    return { data: document };
  }

  @Get(':id/download')
  @RequirePermissions('document.download')
  @ApiOperation({ summary: 'Download a generated document PDF' })
  async download(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StreamableFile> {
    const { file, buffer, disposition } = await this.documentsService.download(
      user.organizationId,
      id,
    );

    return new StreamableFile(buffer, {
      type: file.mimeType,
      disposition,
      length: file.size,
    });
  }

  @Get(':id')
  @RequirePermissions('document.view')
  @ApiOperation({ summary: 'Get generated document metadata' })
  @ApiOkResponse({ type: GeneratedDocumentDetailResponseDto })
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const document = await this.documentsService.findById(user.organizationId, id);
    return { data: document };
  }
}
