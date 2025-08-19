// src/modules/atendimento/dtos/message.dto.ts
import { Intent, ITextResponse } from './common.types';

export interface IMessageRequestDTO {
  tenantId: string;
  text: string;
  pessoas?: number;
  preferTZ?: string; // ex.: "America/Sao_Paulo"
}

export type IMessageResponseDTO = ITextResponse;

export interface IRouterGuessIntent {
  (text: string): Intent;
}
