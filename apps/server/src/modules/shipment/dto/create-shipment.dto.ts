import { IsString, IsArray, ValidateNested, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class ShipmentItemDto {
  @IsString()
  skuId!: string;

  @IsNumber()
  quantity!: number;

  @IsOptional()
  @IsString()
  lotNo?: string;
}

export class CreateShipmentDto {
  @IsString()
  orderId!: string;

  @IsString()
  fromWarehouseId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShipmentItemDto)
  items!: ShipmentItemDto[];

  @IsOptional()
  @IsString()
  carrier?: string;

  @IsOptional()
  @IsString()
  trackingNo?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
