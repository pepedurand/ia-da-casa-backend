import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { IaModule } from './models/ia/ia.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [DatabaseModule, IaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
