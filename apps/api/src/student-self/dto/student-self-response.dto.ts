import { ApiProperty } from '@nestjs/swagger';
import { StudentResponseDto } from '../../students/dto/student-response.dto';
import { PaginatedStudentFeesResponseDto } from '../../fees/dto/fee-response.dto';

export class StudentSelfProfileResponseDto {
  @ApiProperty({ type: StudentResponseDto })
  data!: StudentResponseDto;
}

export { PaginatedStudentFeesResponseDto as StudentSelfFeesResponseDto };
