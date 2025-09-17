import { Injectable, OnModuleInit } from '@nestjs/common';
import { InformacoesRepository } from './repositories/Informacoes.repository';

export interface Store {
  horarios: any[];
  programacao: any[];
  informacoes: any[];
}

@Injectable()
export class ContentStore implements OnModuleInit {
  private store: Store;

  constructor(private readonly repo: InformacoesRepository) {}

  async onModuleInit() {
    await this.warm();
  }

  async warm() {
    this.store = {
      horarios: await this.repo.getByKind('horarios'),
      programacao: await this.repo.getByKind('programacao'),
      informacoes: await this.repo.getByKind('informacoes'),
    };
  }

  get(): Store {
    return this.store;
  }
}
