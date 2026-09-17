import { ApiProperty } from '@nestjs/swagger';

export class FileResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'staff-photo.pdf' })
  originalName!: string;

  @ApiProperty({ example: 'application/pdf' })
  mimeType!: string;

  @ApiProperty({ example: 1024 })
  size!: number;

  @ApiProperty({ required: false, nullable: true })
  checksum?: string | null;

  @ApiProperty({ required: false, nullable: true })
  extension?: string | null;

  @ApiProperty()
  createdAt!: string;
}

export class FileUploadResponseDto {
  @ApiProperty({ type: FileResponseDto })
  data!: FileResponseDto;
}
