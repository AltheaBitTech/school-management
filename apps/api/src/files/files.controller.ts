import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { FILE_UPLOAD_FIELD_NAME, MAX_FILE_SIZE_BYTES } from './constants/file.constants';
import { FileUploadResponseDto } from './dto/file-response.dto';
import { FilesService } from './files.service';
import { buildContentDispositionFilename } from './utils/filename.util';

@ApiTags('files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post()
  @RequirePermissions('file.create')
  @UseInterceptors(
    FileInterceptor(FILE_UPLOAD_FIELD_NAME, {
      storage: memoryStorage(),
      limits: {
        fileSize: MAX_FILE_SIZE_BYTES,
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: [FILE_UPLOAD_FIELD_NAME],
      properties: {
        [FILE_UPLOAD_FIELD_NAME]: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload a tenant-scoped file' })
  @ApiOkResponse({ type: FileUploadResponseDto })
  async upload(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    const created = await this.filesService.upload(user.organizationId, user, file);
    return { data: this.filesService.toDto(created) };
  }

  @Get(':id')
  @RequirePermissions('file.view')
  @ApiOperation({ summary: 'Download a protected file' })
  async download(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StreamableFile> {
    const { file, buffer } = await this.filesService.download(user.organizationId, id);

    return new StreamableFile(buffer, {
      type: file.mimeType,
      disposition: buildContentDispositionFilename(file.originalName),
      length: file.size,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('file.delete')
  @ApiOperation({ summary: 'Delete a tenant-scoped file' })
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.filesService.delete(user.organizationId, id);
  }
}
