import { IsArray, IsNumber, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ReceiveItemDto {
  @IsString()
  skuId!: string;

  @IsNumber()
  qty!: number;
}

export class ReceiveDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiveItemDto)
  items!: ReceiveItemDto[];
}
