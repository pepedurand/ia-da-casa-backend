// src/modules/atendimento/dtos/common.types.ts

export const DEFAULT_TZ = 'America/Sao_Paulo';

export enum Intent {
  HORARIO = 'horario',
  CARDAPIO = 'cardapio',
  RESERVA = 'reserva',
  CAFE_DA_MANHA = 'cafe_da_manha',
  MENU_EXECUTIVO = 'menu_executivo',
  EVENTOS_SAZONAIS = 'eventos_sazonais',
  MUSICA_AO_VIVO = 'musica_ao_vivo',
  STANDUP = 'standup',
  ANIVERSARIO = 'aniversario',
  ENDERECO = 'endereco',
  PAGAMENTO = 'pagamento',
  PET_FRIENDLY = 'pet_friendly',
  ROLHA = 'rolha',
  TAXA_BOLO = 'taxa_bolo',
  EVENTO_FECHADO = 'evento_fechado',
  FEEDBACK = 'feedback',
  DESCONHECIDO = 'desconhecido',
}

export interface ITenantBase {
  tenantId: string;
}

export interface ITextResponse {
  text: string;
  intent?: Intent;
  suggestedActions?: Array<{ label: string; payload?: any; url?: string }>;
}

export type EventKind = 'sazonal' | 'musica' | 'standup' | 'cafe' | 'executivo';

export type PolicyTopic =
  | 'rolha'
  | 'taxa_bolo'
  | 'pet'
  | 'pagamento'
  | 'reserva_encerrada';

export interface ITenantConfig {
  tenantId: string;
  nome: string;
  cardapioDigitalUrl?: string;
  reservaOnlineAte: number; // ex.: 8
  horarioPadrao: Record<string, string>; // seg..dom -> "10h-13h"
  links?: {
    reservas?: string;
    whatsapp?: string;
    maps?: string;
    cardapioCafe?: string;
  };
}
