import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VisitorPassVisitorDto {
  @ApiProperty()
  visitorCode!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  mobile!: string;

  @ApiPropertyOptional()
  organization?: string | null;

  @ApiProperty()
  purpose!: string;

  @ApiProperty()
  host!: string;

  @ApiProperty()
  checkInTime!: string;

  @ApiPropertyOptional()
  vehicleNumber?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  photoFileId?: string | null;
}

export class VisitorPassOrganizationDto {
  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  city?: string;
}

export class VisitorPassResponseDto {
  @ApiProperty({ type: VisitorPassVisitorDto })
  visitor!: VisitorPassVisitorDto;

  @ApiProperty({ type: VisitorPassOrganizationDto })
  organization!: VisitorPassOrganizationDto;

  @ApiProperty({ description: 'Base64 PNG data URL for the visitor QR code' })
  qrCodeDataUrl!: string;

  @ApiProperty()
  passGeneratedAt!: string;
}

export class VisitorPassDetailResponseDto {
  @ApiProperty({ type: VisitorPassResponseDto })
  data!: VisitorPassResponseDto;
}
