import { Module, Provider } from '@nestjs/common';
import { AtendimentoController } from './atendimento.controller';
import { AtendimentoService, IDataProvider } from './atendimento.service';
import { DATA_PROVIDER } from './tokens';
import { OpenAIGateway } from './openai.gateway';
import { LLMController } from './llm.controller';

class DataProviderUnbound implements IDataProvider {
  private err() {
    throw new Error('[DATA_PROVIDER] não configurado');
  }
  getTenantConfig(): any {
    this.err();
  }
  checkClosure(): any {
    this.err();
  }
  getHours(): any {
    this.err();
  }
  listEvents(): any {
    this.err();
  }
  getPolicy(): any {
    this.err();
  }
  createReservation(): any {
    this.err();
  }
  handoff(): any {
    this.err();
  }
}
const defaultProvider: Provider = {
  provide: DATA_PROVIDER,
  useClass: DataProviderUnbound,
};

@Module({
  controllers: [AtendimentoController, LLMController],
  providers: [AtendimentoService, OpenAIGateway, defaultProvider],
  exports: [AtendimentoService, OpenAIGateway],
})
export class AtendimentoModule {}
