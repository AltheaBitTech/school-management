import { ApiProperty } from '@nestjs/swagger';

export class SuggestOrganizationCodeResponseDto {
  @ApiProperty({ example: 'delhi-public-school' })
  code!: string;

  @ApiProperty({
    description: 'Whether this code is currently available for registration',
  })
  available!: boolean;
}
