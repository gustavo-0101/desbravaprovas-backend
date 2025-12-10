import { Module } from '@nestjs/common';
import { ClubesService } from './clubes.service';
import { ClubesController } from './clubes.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ClubesController],
  providers: [ClubesService],
  exports: [ClubesService],
})
export class ClubesModule {}
