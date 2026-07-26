import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { ProductModule } from '../product/product.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [ProductModule, InventoryModule],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
