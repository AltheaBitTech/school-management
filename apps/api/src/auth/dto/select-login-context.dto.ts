import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class SelectLoginContextDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  selectionToken!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  roleId!: string;
}
