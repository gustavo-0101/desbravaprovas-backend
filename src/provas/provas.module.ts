import { Module } from '@nestjs/common';
import { ProvasService } from './provas.service';
import { ProvasController } from './provas.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProvasController],
  providers: [ProvasService],
  exports: [ProvasService],
})
export class ProvasModule {}
