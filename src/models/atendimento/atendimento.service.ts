// src/modules/atendimento/atendimento.service.ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DATA_PROVIDER } from './tokens';
import {
  ITenantConfig,
  ITextResponse,
  DEFAULT_TZ,
  Intent,
} from './dto/common.types';
import { IMessageRequestDTO } from './dto/message.dto';
import { IGetPolicyResult } from './dto/policy.dto';
import {
  ICheckClosureResult,
  IGetHoursResult,
  IListEventsResult,
  ICreateReservationParams,
  ICreateReservationResult,
  IHandoffParams,
  IHandoffResult,
} from './dto/reserva.dto';

/**
 * >>> PLUG-POINTS <<<
 * IDataProvider: acessa seus dados (DB/Sheets/Notion)
 * ILLMAdapter  : gera texto humano a partir de "fatos" (OpenAI, etc.)
 */
export interface IDataProvider {
  getTenantConfig(params: { tenantId: string }): Promise<ITenantConfig>;
  checkClosure(params: {
    tenantId: string;
    dateISO?: string;
  }): Promise<ICheckClosureResult>;
  /**
   * Se "kind" for informado, retornar o horário para aquele período específico (ex.: "cafe" | "executivo" | "jantar" | "fondue" | "musica" | "standup")
   * Caso contrário, retornar a janela geral do dia.
   */
  getHours(params: {
    tenantId: string;
    dateISO?: string;
    kind?: string;
  }): Promise<IGetHoursResult>;
  /**
   * Listar eventos entre datas (kind: "sazonal" | "musica" | "standup" | "cafe" | "executivo" | "jantar")
   */
  listEvents(params: {
    tenantId: string;
    from?: string;
    to?: string;
    kind?: string;
  }): Promise<IListEventsResult>;
  getPolicy(params: {
    tenantId: string;
    topic: 'rolha' | 'taxa_bolo' | 'pet' | 'pagamento' | 'reserva_encerrada';
  }): Promise<IGetPolicyResult>;
  createReservation(
    params: ICreateReservationParams,
  ): Promise<ICreateReservationResult>;
  handoff(params: IHandoffParams): Promise<IHandoffResult>;
}

/**
 * Adapter mínimo para “humanizar” a resposta.
 * Implemente com OpenAI (Responses API) no seu `OpenAIGateway`
 * e injete aqui com `provide: LLM_ADAPTER`.
 */
export interface ILLMAdapter {
  /**
   * Gera uma resposta humana curta e simpática a partir dos fatos informados.
   * `style`: “bistro_br” aplica tom de atendente brasileiro simpático.
   */
  humanize(input: {
    style: 'bistro_br';
    userText: string;
    facts: Record<string, any>;
    instructions?: string; // instruções extras p/ o modelo
  }): Promise<{
    text: string;
    suggestions?: Array<{ label: string; url?: string; payload?: any }>;
  }>;
}
export const LLM_ADAPTER = 'LLM_ADAPTER';

@Injectable()
export class AtendimentoService {
  private readonly logger = new Logger(AtendimentoService.name);

  constructor(
    @Inject(DATA_PROVIDER) private readonly data: IDataProvider,
    @Inject(LLM_ADAPTER) private readonly llm: ILLMAdapter,
  ) {}

  /* --------------------------- Entrada principal --------------------------- */

  async handleUserMessage(body: IMessageRequestDTO): Promise<ITextResponse> {
    const tenantId = body.tenantId;
    const tz = body.preferTZ || DEFAULT_TZ;
    const intent = this.guessIntent(body.text);

    // roteamento simples para períodos/assuntos
    if (intent === Intent.CAFE_DA_MANHA)
      return this.handlePeriodoQuery({
        tenantId,
        userText: body.text,
        periodo: 'cafe',
        tz,
      });
    if (intent === Intent.MENU_EXECUTIVO)
      return this.handlePeriodoQuery({
        tenantId,
        userText: body.text,
        periodo: 'executivo',
        tz,
      });
    if (intent === Intent.HORARIO)
      return this.handleHorarioGeral({ tenantId, userText: body.text, tz });
    if (intent === Intent.CARDAPIO)
      return this.handleCardapio({ tenantId, userText: body.text });
    if (intent === Intent.PAGAMENTO)
      return this.handlePolitica({
        tenantId,
        userText: body.text,
        topic: 'pagamento',
      });
    if (intent === Intent.PET_FRIENDLY)
      return this.handlePolitica({
        tenantId,
        userText: body.text,
        topic: 'pet',
      });
    if (intent === Intent.ROLHA)
      return this.handlePolitica({
        tenantId,
        userText: body.text,
        topic: 'rolha',
      });
    if (intent === Intent.TAXA_BOLO)
      return this.handlePolitica({
        tenantId,
        userText: body.text,
        topic: 'taxa_bolo',
      });
    if (intent === Intent.MUSICA_AO_VIVO)
      return this.handlePeriodoQuery({
        tenantId,
        userText: body.text,
        periodo: 'musica',
        tz,
      });
    if (intent === Intent.STANDUP)
      return this.handlePeriodoQuery({
        tenantId,
        userText: body.text,
        periodo: 'standup',
        tz,
      });
    if (intent === Intent.EVENTOS_SAZONAIS)
      return this.handlePeriodoQuery({
        tenantId,
        userText: body.text,
        periodo: 'sazonal',
        tz,
      });
    if (intent === Intent.ANIVERSARIO)
      return this.handleAniversario({ tenantId, userText: body.text });
    if (intent === Intent.ENDERECO)
      return this.handleEndereco({ tenantId, userText: body.text });

    // fallback: pedir mais detalhes (deixa o LLM humanizar)
    return this.humanize({
      tenantId,
      userText: body.text,
      facts: { intent: 'desconhecido' },
      instructions:
        'Seja prestativo, faça 1 pergunta de esclarecimento no final. Não invente preços/links. Sugira tópicos comuns (horário, reservas, cardápio).',
    });
  }

  /* --------------------------- Handlers temáticos -------------------------- */

  /**
   * Handler genérico para qualquer “período/atividade”: cafe | executivo | jantar | fondue | musica | standup | sazonal
   */
  async handlePeriodoQuery(params: {
    tenantId: string;
    userText: string;
    periodo: string;
    tz?: string;
    dateISO?: string; // opcional (consulta de outra data)
  }): Promise<ITextResponse> {
    const tz = params.tz || DEFAULT_TZ;
    const now = params.dateISO ? new Date(params.dateISO) : this.nowInTZ(tz);
    const dateISO = now.toISOString();

    // 1) exceções (fechado / horário especial)
    const closure = await this.data.checkClosure({
      tenantId: params.tenantId,
      dateISO,
    });
    if (closure.closed) {
      return this.humanize({
        tenantId: params.tenantId,
        userText: params.userText,
        facts: {
          tipo: 'periodo',
          periodo: params.periodo,
          dateISO,
          fechadoHoje: true,
          motivoFechamento: closure.reason,
        },
        instructions:
          'Explique gentilmente que hoje não haverá esse período por conta da exceção. Sugira próxima data típica e ofereça ajuda para reserva/aviso.',
      });
    }

    // 2) horários do período
    const hours = await this.data.getHours({
      tenantId: params.tenantId,
      dateISO,
      kind: params.periodo,
    });
    // 3) eventos específicos do período (ex.: fondue, musica, sazonal)
    const list = await this.data.listEvents({
      tenantId: params.tenantId,
      from: dateISO.slice(0, 10),
      to: dateISO.slice(0, 10),
      kind: params.periodo,
    });

    const cfg = await this.data.getTenantConfig({ tenantId: params.tenantId });

    // monta fatos crus
    const facts = this.buildPeriodoFacts({
      periodo: params.periodo,
      hours,
      events: list,
      nowHHMM: this.formatHour(now, tz),
      reservaOnlineAte: cfg.reservaOnlineAte,
      links: cfg.links || {},
    });

    // humaniza
    return this.humanize({
      tenantId: params.tenantId,
      userText: params.userText,
      facts,
      instructions: [
        'Responda de forma curta, simpática e natural (tom de atendente brasileiro).',
        'Se já passou do horário de hoje, avise e sugira a próxima janela típica.',
        'Se houver link relevante (cardápio, reservas, WhatsApp), ofereça como opção.',
        'Para grupos maiores que o limite de reservas online, proponha falar com atendimento humano.',
        'Nunca invente preços/detalhes não fornecidos. Se não tiver certeza, diga que pode confirmar com a equipe.',
      ].join(' '),
    });
  }

  /**
   * Horário geral (o que está aberto hoje; usa janela geral do dia + exceções)
   */
  async handleHorarioGeral(params: {
    tenantId: string;
    userText: string;
    tz?: string;
  }): Promise<ITextResponse> {
    const tz = params.tz || DEFAULT_TZ;
    const now = this.nowInTZ(tz);
    const dateISO = now.toISOString();

    const closure = await this.data.checkClosure({
      tenantId: params.tenantId,
      dateISO,
    });
    const hours = await this.data.getHours({
      tenantId: params.tenantId,
      dateISO,
    });
    const cfg = await this.data.getTenantConfig({ tenantId: params.tenantId });

    return this.humanize({
      tenantId: params.tenantId,
      userText: params.userText,
      facts: {
        tipo: 'horario_geral',
        fechadoHoje: closure.closed,
        motivoFechamento: closure.reason,
        janela: hours,
        links: cfg.links || {},
      },
      instructions:
        'Se fechado: explique o motivo e sugira o próximo dia típico. Se aberto: informe a janela e convide para reserva. Seja direto e gentil.',
    });
  }

  /**
   * Cardápio geral / links
   */
  async handleCardapio(params: {
    tenantId: string;
    userText: string;
  }): Promise<ITextResponse> {
    const cfg = await this.data.getTenantConfig({ tenantId: params.tenantId });
    return this.humanize({
      tenantId: params.tenantId,
      userText: params.userText,
      facts: {
        tipo: 'cardapio',
        links: cfg.links || {},
      },
      instructions:
        'Forneça o link do cardápio (quando existir) e ofereça ajuda para reservas. Não invente itens ou preços.',
    });
  }

  /**
   * Políticas (pagamento, pet, rolha, taxa_bolo, reserva_encerrada)
   */
  async handlePolitica(params: {
    tenantId: string;
    userText: string;
    topic: 'rolha' | 'taxa_bolo' | 'pet' | 'pagamento' | 'reserva_encerrada';
  }): Promise<ITextResponse> {
    const pol = await this.data.getPolicy({
      tenantId: params.tenantId,
      topic: params.topic,
    });
    return this.humanize({
      tenantId: params.tenantId,
      userText: params.userText,
      facts: {
        tipo: 'politica',
        topic: params.topic,
        texto: pol?.text,
        meta: pol?.meta,
      },
      instructions:
        'Explique a política em 1–2 frases, sem soar robótico. Se fizer sentido, ofereça ajuda para reserva/contato.',
    });
  }

  /**
   * Endereço / como chegar
   */
  async handleEndereco(params: {
    tenantId: string;
    userText: string;
  }): Promise<ITextResponse> {
    const cfg = await this.data.getTenantConfig({ tenantId: params.tenantId });
    return this.humanize({
      tenantId: params.tenantId,
      userText: params.userText,
      facts: {
        tipo: 'endereco',
        endereco: cfg['endereco'],
        links: cfg.links || {},
      },
      instructions:
        'Informe o endereço curto e inclua link do Maps, se existir. Seja objetivo e simpático.',
    });
  }

  /**
   * Aniversário (cortesia, taxa de bolo etc.)
   */
  async handleAniversario(params: {
    tenantId: string;
    userText: string;
  }): Promise<ITextResponse> {
    const [bolo, pet, rolha, pag] = await Promise.all([
      this.data.getPolicy({ tenantId: params.tenantId, topic: 'taxa_bolo' }),
      this.data.getPolicy({ tenantId: params.tenantId, topic: 'pet' }),
      this.data.getPolicy({ tenantId: params.tenantId, topic: 'rolha' }),
      this.data.getPolicy({ tenantId: params.tenantId, topic: 'pagamento' }),
    ]);

    const cfg = await this.data.getTenantConfig({ tenantId: params.tenantId });

    return this.humanize({
      tenantId: params.tenantId,
      userText: params.userText,
      facts: {
        tipo: 'aniversario',
        politicas: {
          taxa_bolo: bolo?.text,
          pet: pet?.text,
          rolha: rolha?.text,
          pagamento: pag?.text,
        },
        links: cfg.links || {},
      },
      instructions:
        'Parabenize com carinho e explique as políticas relevantes (cortesia/bolo/rolha) de forma amigável. Ofereça reserva e combine detalhes se necessário.',
    });
  }

  /**
   * Criar reserva (aplica regra de limite → handoff humano)
   */
  async reservar(params: ICreateReservationParams): Promise<ITextResponse> {
    const cfg = await this.data.getTenantConfig({ tenantId: params.tenantId });
    const limite = cfg.reservaOnlineAte ?? 8;

    if (params.pessoas > limite) {
      const ho = await this.data.handoff({
        tenantId: params.tenantId,
        motivo: 'Grupo maior que reserva online',
        contexto: JSON.stringify(params),
      });
      return this.humanize({
        tenantId: params.tenantId,
        userText: `Reserva para ${params.pessoas} pessoas`,
        facts: {
          tipo: 'handoff',
          motivo: 'grupo_maior_limite',
          limite,
          canal: ho.channel,
          destino: ho.destino,
        },
        instructions:
          'Explique que para grupos maiores o atendimento humano assume. Informe canal/destino e se ofereça para encaminhar.',
      });
    }

    const res = await this.data.createReservation(params);
    if (!res.ok) {
      const pol = await this.data.getPolicy({
        tenantId: params.tenantId,
        topic: 'reserva_encerrada',
      });
      return this.humanize({
        tenantId: params.tenantId,
        userText: `Falha reserva (${params.pessoas} pessoas)`,
        facts: {
          tipo: 'reserva_falhou',
          reason: res.reason,
          textoPolitica: pol?.text,
        },
        instructions:
          'Peça desculpas brevemente, explique que as reservas online podem encerrar por alta demanda e ofereça WhatsApp/telefone como alternativa.',
      });
    }

    return this.humanize({
      tenantId: params.tenantId,
      userText: `Reserva confirmada`,
      facts: { tipo: 'reserva_ok', protocolo: res.protocolo },
      instructions:
        'Confirme com alegria, informe o protocolo e se coloque à disposição para ajustes.',
    });
  }

  /* ----------------------------- Humanização ------------------------------- */

  private async humanize(args: {
    tenantId: string;
    userText: string;
    facts: Record<string, any>;
    instructions?: string;
  }): Promise<ITextResponse> {
    // FAIL-SAFE: se o LLM falhar, devolve um mínimo útil
    try {
      const out = await this.llm.humanize({
        style: 'bistro_br',
        userText: args.userText,
        facts: args.facts,
        instructions: args.instructions,
      });
      return {
        text:
          out.text ||
          'Posso te ajudar com horários, reservas e cardápio. O que você prefere?',
        suggestedActions: out.suggestions,
      };
    } catch (e) {
      this.logger.error('LLM humanize error', e as any);
      return {
        text: 'Consigo te ajudar com horários, reservas e cardápio. Me diz o que você precisa? 😊',
      };
    }
  }

  /* ------------------------------- Utilidades ------------------------------ */

  private guessIntent(text: string): Intent {
    const t = (text || '').toLowerCase();
    if (/(café|cafe)\s*da\s*manh[aã]/.test(t)) return Intent.CAFE_DA_MANHA;
    if (/menu\s*executivo|executivo/.test(t)) return Intent.MENU_EXECUTIVO;
    if (/card[aá]pio|menu/.test(t)) return Intent.CARDAPIO;
    if (/reserv(a|ar)|mesa|booking|book/.test(t)) return Intent.RESERVA;
    if (/hor[aá]rio|abrem|aberto|funcionam|funcionamento/.test(t))
      return Intent.HORARIO;
    if (/m[uú]sica\s*ao\s* vivo|show|jazz/.test(t))
      return Intent.MUSICA_AO_VIVO;
    if (/stand.?up|com[eé]dia/.test(t)) return Intent.STANDUP;
    if (/anivers[aá]rio|parab[eé]ns|bolo/.test(t)) return Intent.ANIVERSARIO;
    if (/endere[cç]o|como\s*chegar|maps/.test(t)) return Intent.ENDERECO;
    if (/pagamento|pix|cr[eé]dito|d[eé]bito|vale/.test(t))
      return Intent.PAGAMENTO;
    if (/pet|cachorro|gato|pet\s*friendly/.test(t)) return Intent.PET_FRIENDLY;
    if (/rolha/.test(t)) return Intent.ROLHA;
    if (/taxa\s*de\s*bolo/.test(t)) return Intent.TAXA_BOLO;
    if (/evento\s*fechado|fechado\s*para/.test(t)) return Intent.EVENTO_FECHADO;
    if (/fondue|fundue/.test(t)) return Intent.EVENTOS_SAZONAIS; // sazonal
    return Intent.DESCONHECIDO;
  }

  private buildPeriodoFacts(input: {
    periodo: string;
    hours: IGetHoursResult;
    events: IListEventsResult;
    nowHHMM: string;
    reservaOnlineAte?: number;
    links: ITenantConfig['links'];
  }) {
    const closes = input.hours?.closesAt || null;
    const opens = input.hours?.opensAt || null;
    const encerrou = closes ? this.isTimeAfter(input.nowHHMM, closes) : false;

    return {
      tipo: 'periodo',
      periodo: input.periodo,
      janela: input.hours || null,
      eventosHoje: input.events?.items || [],
      agoraHHMM: input.nowHHMM,
      encerrouHoje: !!encerrou,
      reservaOnlineAte: input.reservaOnlineAte ?? 8,
      links: input.links || {},
    };
  }

  private nowInTZ(tz = DEFAULT_TZ): Date {
    return new Date(new Date().toLocaleString('en-US', { timeZone: tz }));
  }
  private formatHour(date: Date, tz = DEFAULT_TZ): string {
    const p = new Intl.DateTimeFormat('pt-BR', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date);
    const hh = p.find((x) => x.type === 'hour')?.value ?? '00';
    const mm = p.find((x) => x.type === 'minute')?.value ?? '00';
    return `${hh}:${mm}`;
  }
  private isTimeAfter(hhmm: string, compare: string): boolean {
    const [h1, m1] = hhmm.split(':').map(Number);
    const [h2, m2] = compare.split(':').map(Number);
    if (h1 !== h2) return h1 > h2;
    return m1 > m2;
  }
}
