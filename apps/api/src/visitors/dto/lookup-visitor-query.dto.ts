import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { VISITOR_MOBILE_MAX_LENGTH } from '../constants/visitor.constants';
import { VISITOR_MOBILE_PATTERN } from '../constants/visitor-mobile.constants';

export class LookupVisitorQueryDto {
  @ApiProperty({ example: '9876543210' })
  @IsString()
  @MinLength(1)
  @MaxLength(VISITOR_MOBILE_MAX_LENGTH)
  @Matches(VISITOR_MOBILE_PATTERN, {
    message: 'mobile must be a valid 10-digit Indian mobile number (optional +91 prefix)',
  })
  mobile!: string;
}
