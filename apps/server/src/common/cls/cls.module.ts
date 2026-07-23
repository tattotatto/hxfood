import { Global, Module } from '@nestjs/common';
import { ClsModule as NestClsModule } from 'nestjs-cls';
import { Request } from 'express';
import * as crypto from 'crypto';

@Global()
@Module({
  imports: [
    NestClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        generateId: true,
        idGenerator: (req: Request) =>
          (req.headers['x-request-id'] as string) ?? crypto.randomUUID(),
      },
    }),
  ],
  exports: [NestClsModule],
})
export class ClsModule {}
