import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { BrandController } from './brand.controller';
import { ProductService } from './product.service';

@Module({
  controllers: [ProductController, BrandController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
