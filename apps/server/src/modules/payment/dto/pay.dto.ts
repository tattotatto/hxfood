import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PayDto {
  @ApiProperty({ example: 'uuid-of-order' })
  @IsString()
  orderId!: string;

  @ApiProperty({ enum: ['balance', 'wechat'] })
  @IsString()
  @IsIn(['balance', 'wechat'], { message: 'paymentMethod must be balance or wechat' })
  paymentMethod!: string;
}
