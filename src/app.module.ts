import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { IaModule } from './models/ia/ia.module';
import { DatabaseModule } from './database/database.module';
import { UsuarioModule } from './models/usuario/usuario.module';
import { AuthModule } from './auth/auth.module';
import { AtendenteModule } from './models/atendente/atendente.module';
import { ChatModule } from './models/chat/chat.module';

@Module({
  imports: [
    DatabaseModule,
    IaModule,
    UsuarioModule,
    AuthModule,
    AtendenteModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
