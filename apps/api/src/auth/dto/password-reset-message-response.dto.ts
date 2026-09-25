import { ApiProperty } from '@nestjs/swagger';

export class PasswordResetMessageResponseDto {
  @ApiProperty()
  message!: string;
}
