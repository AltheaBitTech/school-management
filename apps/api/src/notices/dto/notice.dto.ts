import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NoticeAudienceType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class NoticeAudienceInputDto {
  @ApiProperty({ enum: NoticeAudienceType })
  @IsEnum(NoticeAudienceType)
  audienceType!: NoticeAudienceType;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;
}

export class CreateNoticeDto {
  @ApiProperty({ example: 'Parent-teacher meeting' })
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiProperty({ example: 'Meeting scheduled for Friday at 3 PM.' })
  @IsString()
  @MinLength(1)
  content!: string;

  @ApiProperty({ type: [NoticeAudienceInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => NoticeAudienceInputDto)
  audiences!: NoticeAudienceInputDto[];
}

export class UpdateNoticeDto {
  @ApiPropertyOptional({ example: 'Updated title' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @ApiPropertyOptional({ example: 'Updated content' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string;

  @ApiPropertyOptional({ type: [NoticeAudienceInputDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => NoticeAudienceInputDto)
  audiences?: NoticeAudienceInputDto[];

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  scheduledAt?: Date | null;
}
