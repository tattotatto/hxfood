import { Module } from '@nestjs/common';
import { FranchiseController } from './franchise.controller';
import { FranchiseService } from './franchise.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FranchiseController],
  providers: [FranchiseService],
})
export class FranchiseModule {}
