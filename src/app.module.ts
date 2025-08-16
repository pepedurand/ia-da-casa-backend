import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { DatabaseModule } from './database/database.module';
import { IaModule } from './models/ia/ia.module';

@Module({
  imports: [DatabaseModule, IaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
