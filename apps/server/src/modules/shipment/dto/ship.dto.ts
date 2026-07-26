import { IsOptional, IsString } from 'class-validator';

export class ShipDto {
  @IsOptional()
  @IsString()
  carrier?: string;

  @IsOptional()
  @IsString()
  trackingNo?: string;
}
