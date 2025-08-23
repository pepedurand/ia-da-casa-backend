import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ContentStore } from './content.store';
import { InformacoesEntity } from './entities/Informacoes.entity';
import { ScheduleTool } from './tools/schedule.tool';
import { InformacoesRepository } from './repositories/Informacoes.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([InformacoesEntity]), // conecta Entity ao TypeORM
  ],
  controllers: [ChatController],
  providers: [ChatService, ContentStore, ScheduleTool, InformacoesRepository],
  exports: [ChatService],
})
export class ChatModule {}
