import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ScanAttendanceDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  token?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  employeeCode?: string;
}
