import { Module } from '@nestjs/common';
import { AtendenteService } from './atendente.service';
import { AtendenteController } from './atendente.controller';

@Module({
  controllers: [AtendenteController],
  providers: [AtendenteService],
  exports: [AtendenteService],
})
export class AtendenteModule {}
