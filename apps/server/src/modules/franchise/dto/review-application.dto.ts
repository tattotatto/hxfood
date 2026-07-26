import { IsBoolean, IsOptional, IsString, ValidateIf } from 'class-validator';

export class ReviewApplicationDto {
  @IsBoolean()
  approved!: boolean;

  @IsOptional()
  @IsString()
  comment?: string;
}
