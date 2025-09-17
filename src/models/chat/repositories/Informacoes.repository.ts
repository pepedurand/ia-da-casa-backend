// import { Injectable } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { InformacoesEntity } from '../entities/Informacoes.entity';

// @Injectable()
// export class InformacoesRepository {
//   constructor(
//     @InjectRepository(InformacoesEntity)
//     private readonly repo: Repository<InformacoesEntity>,
//   ) {}

//   async getByKind(kind: string): Promise<any> {
//     const row = await this.repo.findOne({
//       where: { kind },
//       order: { version: 'DESC' },
//     });
//     return row?.data;
//   }

//   async save(kind: string, data: any): Promise<InformacoesEntity> {
//     const last = await this.repo.findOne({
//       where: { kind },
//       order: { version: 'DESC' },
//     });
//     const version = last ? last.version + 1 : 1;
//     return this.repo.save({ kind, data, version });
//   }
// }
