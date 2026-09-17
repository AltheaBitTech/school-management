import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class GenerateBonafideDocumentDto {
  @ApiProperty({ description: 'Student ID for the bonafide certificate subject' })
  @IsUUID()
  studentId!: string;
}
