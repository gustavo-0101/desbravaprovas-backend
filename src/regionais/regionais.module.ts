import { Module } from '@nestjs/common';
import { RegionaisService } from './regionais.service';
import { RegionaisController } from './regionais.controller';

@Module({
  providers: [RegionaisService],
  controllers: [RegionaisController]
})
export class RegionaisModule {}
