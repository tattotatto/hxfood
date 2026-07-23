import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ClsService } from 'nestjs-cls';
import { brandIsolationExtension } from './prisma-brand.extension';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private cls: ClsService) {
    super();
  }

  async onModuleInit() {
    const extended = this.$extends(brandIsolationExtension(this.cls)) as unknown as this;
    Object.setPrototypeOf(this, Object.getPrototypeOf(extended));
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
