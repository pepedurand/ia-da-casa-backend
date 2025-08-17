import { Module } from '@nestjs/common';
import { IaService } from './ia.service';
import { IaController } from './ia.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversasAgentes } from './conversas-agentes.entity';
import { Agentes } from './agentes.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ConversasAgentes, Agentes])],
  controllers: [IaController],
  providers: [IaService],
})
export class IaModule {}
