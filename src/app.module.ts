import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { DatabaseModule } from './database/database.module';
import { UsuarioModule } from './models/usuario/usuario.module';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './models/chat/chat.module';

@Module({
  imports: [DatabaseModule, UsuarioModule, AuthModule, ChatModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
