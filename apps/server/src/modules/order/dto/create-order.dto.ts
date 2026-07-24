import { IsString, IsArray, IsOptional, Min, Matches, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderItemDto {
  @ApiProperty({ example: 'uuid-of-sku' })
  @IsString()
  skuId!: string;

  @ApiProperty({ example: 1.5 })
  @Min(0.001)
  quantity!: number;
}

export class CreateOrderDto {
  @ApiProperty({ example: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6' })
  @IsString()
  @Matches(/^[a-f0-9]{32}$/, { message: 'Invalid idempotency key format' })
  idempotencyKey!: string;

  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @ApiProperty({ enum: ['balance', 'wechat', 'credit', 'mixed'] })
  @IsString()
  paymentMethod!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  shippingAddress?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  expectedAt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
