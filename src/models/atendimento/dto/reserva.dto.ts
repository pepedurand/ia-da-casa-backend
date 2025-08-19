// src/modules/atendimento/dtos/reserva.dto.ts
import { ITenantBase } from './common.types';

export interface ICreateReservationParams extends ITenantBase {
  nome: string;
  pessoas: number;
  dataISO: string; // "2025-08-23T10:30:00-03:00"
  telefone?: string;
  obs?: string;
}
export interface ICreateReservationResult {
  ok: boolean;
  protocolo?: string;
  humanHandoff?: boolean;
  reason?: string;
}

export interface IHandoffParams extends ITenantBase {
  motivo: string;
  contexto: string;
}
export interface IHandoffResult {
  channel: 'whatsapp' | 'sms' | 'email';
  destino: string;
}

// Fechamentos / Exceções
export interface ICheckClosureParams extends ITenantBase {
  dateISO?: string;
}
export interface ICheckClosureResult {
  closed: boolean;
  reason?: string;
}

// Horários
export interface IGetHoursParams extends ITenantBase {
  dateISO?: string;
}
export interface IGetHoursResult {
  label: string; // "10h-13h"
  opensAt?: string; // "10:00"
  closesAt?: string; // "13:00"
  isCafe?: boolean; // se representa janela de café
}

// Eventos
export interface IListEventsParams extends ITenantBase {
  from?: string; // "YYYY-MM-DD"
  to?: string; // "YYYY-MM-DD"
  kind?: 'sazonal' | 'musica' | 'standup' | 'cafe' | 'executivo';
}
export interface IListEventsResultItem {
  title: string;
  when: string; // "2025-08-23 10:00-13:00"
  notes?: string;
  link?: string;
}
export interface IListEventsResult {
  items: IListEventsResultItem[];
}
