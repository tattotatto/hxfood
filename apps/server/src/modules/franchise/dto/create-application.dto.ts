import { IsString, IsOptional, IsNumber, MaxLength, MinLength } from 'class-validator';

export class CreateApplicationDto {
  @IsString()
  brandId!: string;

  @IsString()
  @MaxLength(50)
  applicantName!: string;

  @IsString()
  @MaxLength(20)
  applicantPhone!: string;

  @IsString()
  @MaxLength(200)
  storeName!: string;

  @IsString()
  @MaxLength(50)
  city!: string;

  @IsString()
  @MaxLength(300)
  address!: string;

  @IsOptional()
  @IsNumber()
  investmentBudget?: number;

  @IsOptional()
  @IsString()
  remark?: string;
}
