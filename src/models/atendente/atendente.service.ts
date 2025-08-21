import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { ResponseInput, Tool } from 'openai/resources/responses/responses';

/**
 * ============================
 * Tipos & Dados (SEUS)
 * ============================
 */
type Faixa = { inicio: string; fim?: string };
interface HorariosDeFuncionamento {
  nome: DiasDaSemana;
  horarios: Faixa[];
  estaAberto?: boolean;
  options?: string[];
}
enum DiasDaSemana {
  SEGUNDA = 'segunda',
  TERCA = 'terça',
  QUARTA = 'quarta',
  QUINTA = 'quinta',
  SEXTA = 'sexta',
  SABADO = 'sábado',
  DOMINGO = 'domingo',
}
interface Programacao {
  nomes: string[];
  horarios: HorariosDeFuncionamento[];
  descricao: string;
  limitado?: boolean;
}
interface Informacoes {
  nomes: string[];
  observacoes: string[];
}

const BUSINESS_TZ = process.env.BUSINESS_TZ || 'America/Sao_Paulo';

/**
 * Cole aqui seus arrays
 */
const horariosDeFuncionamento: HorariosDeFuncionamento[] = [
  { nome: DiasDaSemana.SEGUNDA, horarios: [{ inicio: '12:00', fim: '16:00' }] },
  { nome: DiasDaSemana.TERCA, horarios: [{ inicio: '12:00', fim: '16:00' }] },
  {
    nome: DiasDaSemana.QUARTA,
    horarios: [
      { inicio: '12:00', fim: '15:00' },
      { inicio: '18:00', fim: '23:00' },
    ],
  },
  { nome: DiasDaSemana.QUINTA, horarios: [{ inicio: '12:00', fim: '23:00' }] },
  { nome: DiasDaSemana.SEXTA, horarios: [{ inicio: '12:00', fim: '23:00' }] },
  { nome: DiasDaSemana.SABADO, horarios: [{ inicio: '10:00', fim: '23:00' }] },
  { nome: DiasDaSemana.DOMINGO, horarios: [{ inicio: '10:00', fim: '18:00' }] },
];

const programacao: Programacao[] = [
  {
    nomes: ['executivo', 'menu executivo'],
    horarios: [
      {
        nome: DiasDaSemana.SEGUNDA,
        horarios: [{ inicio: '12:00', fim: '16:00' }],
      },
      {
        nome: DiasDaSemana.TERCA,
        horarios: [{ inicio: '12:00', fim: '16:00' }],
      },
      {
        nome: DiasDaSemana.QUARTA,
        horarios: [{ inicio: '12:00', fim: '15:00' }],
      },
      {
        nome: DiasDaSemana.QUINTA,
        horarios: [{ inicio: '12:00', fim: '16:00' }],
      },
      {
        nome: DiasDaSemana.SEXTA,
        horarios: [{ inicio: '12:00', fim: '16:00' }],
      },
    ],
    descricao:
      'Duas opções de executivo: (1) escolha 1 carne, 1 acompanhamento e 1 molho; (2) entrada + principal + sobremesa, com novidades quinzenais.',
  },
  {
    nomes: ['cafe', 'café da manhã'],
    horarios: [
      {
        nome: DiasDaSemana.SABADO,
        horarios: [{ inicio: '10:00', fim: '13:00' }],
      },
      {
        nome: DiasDaSemana.DOMINGO,
        horarios: [{ inicio: '10:00', fim: '13:00' }],
      },
    ],
    descricao:
      'Menu completo com pães, frutas, bolos e bebidas quentes. Opções veganas e vegetarianas. Combos e à la carte.',
  },
  {
    nomes: ['jantar'],
    horarios: [
      {
        nome: DiasDaSemana.QUARTA,
        horarios: [{ inicio: '18:00', fim: '23:00' }],
      },
      {
        nome: DiasDaSemana.QUINTA,
        horarios: [{ inicio: '18:00', fim: '23:00' }],
      },
      {
        nome: DiasDaSemana.SEXTA,
        horarios: [{ inicio: '18:00', fim: '23:00' }],
      },
      {
        nome: DiasDaSemana.SABADO,
        horarios: [{ inicio: '18:00', fim: '23:00' }],
      },
    ],
    descricao:
      'Pratos quentes, saladas e sobremesas — perfeito para fechar o dia.',
  },
  {
    nomes: ['menu completo', 'cardapio completo'],
    horarios: [
      { nome: DiasDaSemana.SEGUNDA, horarios: [{ inicio: '12:00' }] },
      { nome: DiasDaSemana.TERCA, horarios: [{ inicio: '12:00' }] },
      { nome: DiasDaSemana.QUARTA, horarios: [{ inicio: '12:00' }] },
      { nome: DiasDaSemana.QUINTA, horarios: [{ inicio: '12:00' }] },
      { nome: DiasDaSemana.SEXTA, horarios: [{ inicio: '12:00' }] },
      { nome: DiasDaSemana.SABADO, horarios: [{ inicio: '13:00' }] }, // sáb a partir de 13h
      { nome: DiasDaSemana.DOMINGO, horarios: [{ inicio: '13:00' }] },
    ],
    descricao: '',
  },
  {
    nomes: ['fondue', 'foundue da casa', 'foundue da gloria'],
    limitado: true,
    horarios: [
      { nome: DiasDaSemana.QUARTA, horarios: [{ inicio: '19:00' }] },
      { nome: DiasDaSemana.QUINTA, horarios: [{ inicio: '19:00' }] },
      { nome: DiasDaSemana.SEXTA, horarios: [{ inicio: '19:00' }] },
      { nome: DiasDaSemana.SABADO, horarios: [{ inicio: '19:00' }] },
    ],
    descricao:
      'Experiência de fondue com opções de queijo, carne e chocolate. Todas as opções servem duas pessoas. Por tempo limitado.',
  },
  {
    nomes: ['musica ao vivo', 'musica instrumental', 'musica'],
    horarios: [{ nome: DiasDaSemana.SEXTA, horarios: [{ inicio: '19:00' }] }],
    descricao: 'Música ao vivo instrumental para acompanhar seu fondue.',
  },
];

const informacoes: Informacoes[] = [
  {
    nomes: ['cardapio', 'valores'],
    observacoes: [
      'Nossos cardápios e valores estão em: https://linktr.ee/bitrodacasa',
    ],
  },
  {
    nomes: ['endereco'],
    observacoes: [
      'Endereço: Ladeira da Glória, 98, Glória, Rio de Janeiro - RJ',
    ],
  },
  {
    nomes: [
      'eventos particulares',
      'casamentos',
      'festas de 15 anos',
      'eventos corporativos',
    ],
    observacoes: [
      'Realizamos eventos! Para orçamento: contato@casadagloria.com.br',
    ],
  },
  {
    nomes: ['reservas'],
    observacoes: [
      'Reserve em: https://linktr.ee/bitrodacasa → “Reserva online”.',
      'Se não aparecer data no sistema, é porque não há disponibilidade.',
      'Atendemos sem reserva também, mas a disponibilidade pode ser limitada.',
    ],
  },
  {
    nomes: ['estacionamento'],
    observacoes: ['Temos estacionamento no local, normalmente há vagas.'],
  },
  {
    nomes: ['como chegar'],
    observacoes: [
      'Metrô: estação Glória + 10 minutos a pé.',
      'Também encontra nos apps buscando por “Bistrô da Casa”.',
    ],
  },
  {
    nomes: [
      'formas de pagamento',
      'tipos de pagamento',
      'voces aceitam {cartao}',
    ],
    observacoes: [
      'Aceitamos American Express, Diners, Hipercard, Mastercard, Visa, Elo (crédito/debito), Ticket Refeição e Sodexo. O único cartão que não aceitamos ainda é o Alelo.',
    ],
  },
  // extras
  {
    nomes: [
      'aniversario',
      'aniversário',
      'bolo',
      'taxa de bolo',
      'comemoração',
    ],
    observacoes: [
      'Sobremesa cortesia para o aniversariante — avise ao garçom 🥳.',
      'Taxa de bolo: terça a quinta NÃO cobramos; sexta a domingo: R$50.',
      'WhatsApp para combinar: http://wa.me/5521965855546',
    ],
  },
  {
    nomes: [
      'pet',
      'pet friendly',
      'cachorro',
      'gato',
      'animal de estimacao',
      'animal de estimação',
    ],
    observacoes: ['Somos pet friendly! Mantenha seu pet sempre na guia. 🐶🐱'],
  },
  {
    nomes: [
      'feedback',
      'reclamacao',
      'reclamação',
      'elogio',
      'sugestao',
      'sugestão',
      'avaliacao',
      'avaliação',
    ],
    observacoes: [
      'Conte pra gente sua experiência! Estamos sempre melhorando 💙',
    ],
  },
  {
    nomes: ['reserva esgotada', 'sem vagas', 'lotado', 'sem disponibilidade'],
    observacoes: [
      'Se o sistema não mostra horários/datas, é porque não há disponibilidade.',
      'Chame no WhatsApp para checar desistências: 21 96585-5546.',
      'Reservas/infos: https://linktr.ee/bistrodacasa',
    ],
  },
  {
    nomes: ['rolha', 'taxa de rolha', 'vinho', 'levar vinho'],
    observacoes: [
      'Sem taxa de rolha: terça a quinta.',
      'Sexta a domingo: taxa de rolha R$40.',
      'Temos carta de vinhos especial 🍷.',
    ],
  },
];

/**
 * ============================
 * Utils
 * ============================
 */
const idxToNome: string[] = [
  'domingo',
  'segunda',
  'terça',
  'quarta',
  'quinta',
  'sexta',
  'sábado',
];
const nomeToIdx: Record<string, number> = {
  domingo: 0,
  dom: 0,
  segunda: 1,
  seg: 1,
  'segunda-feira': 1,
  terça: 2,
  terca: 2,
  ter: 2,
  'terça-feira': 2,
  quarta: 3,
  qua: 3,
  'quarta-feira': 3,
  quinta: 4,
  qui: 4,
  'quinta-feira': 4,
  sexta: 5,
  sex: 5,
  'sexta-feira': 5,
  sábado: 6,
  sabado: 6,
  sáb: 6,
  sab: 6,
  'sábado-feira': 6,
};
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
const horaToMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (isNaN(m) ? 0 : m);
};
const nowPartsInTZ = (tz = BUSINESS_TZ, at?: Date) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
  }).formatToParts(at ?? new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value!;
  const mapWeek: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    weekdayIndex: mapWeek[get('weekday')],
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    isoLocal: `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`,
  };
};
const cardapioCompletoAPartir = (diaIdx: number) =>
  diaIdx === 0 || diaIdx === 6 ? '13:00' : '12:00';

function funcionamentoDoDia(diaIdx: number): Faixa[] {
  const nome = idxToNome[diaIdx] as DiasDaSemana;
  return horariosDeFuncionamento.find((d) => d.nome === nome)?.horarios ?? [];
}
function eventoPorTermo(termo: string): Programacao | null {
  const q = norm(termo);
  return (
    (programacao.find((p) => p.nomes.some((n) => norm(n).includes(q))) ||
      programacao.find((p) =>
        q
          .split(/\s+/)
          .some((tok) => p.nomes.some((n) => norm(n).includes(tok))),
      )) ??
    null
  );
}
function faixasEventoNoDia(evento: Programacao, diaIdx: number): Faixa[] {
  const nomeDia = idxToNome[diaIdx] as DiasDaSemana;
  return evento.horarios.find((h) => h.nome === nomeDia)?.horarios ?? [];
}
function buscarInfo(
  termo: string,
): { termos: string[]; observacoes: string[] } | null {
  const q = norm(termo);
  const hit =
    informacoes.find((i) => i.nomes.some((n) => norm(n).includes(q))) ||
    informacoes.find((i) =>
      q.split(/\s+/).some((t) => i.nomes.some((n) => norm(n).includes(t))),
    );
  return hit ? { termos: hit.nomes, observacoes: hit.observacoes } : null;
}

/** Compacta dias em texto: ["quarta","quinta","sexta","sábado"] -> "de quarta a sábado" */
function formatarDias(dias: string[]): string {
  const indices = dias
    .map((d) => nomeToIdx[d])
    .filter((x) => x !== undefined)
    .sort((a, b) => a - b);
  if (!indices.length) return '';
  // monta faixas consecutivas
  const ranges: Array<[number, number]> = [];
  let start = indices[0];
  let prev = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const cur = indices[i];
    if (cur === prev + 1) {
      prev = cur;
      continue;
    }
    ranges.push([start, prev]);
    start = prev = cur;
  }
  ranges.push([start, prev]);

  const partes = ranges.map(([a, b]) =>
    a === b ? idxToNome[a] : `de ${idxToNome[a]} a ${idxToNome[b]}`,
  );
  if (partes.length === 1) return partes[0];
  if (partes.length === 2) return `${partes[0]} e ${partes[1]}`;
  return `${partes.slice(0, -1).join(', ')} e ${partes.at(-1)}`;
}

/**
 * ============================
 * System prompt (ajustado)
 * ============================
 */
const SYSTEM_INSTRUCTIONS = `
Você é uma atendente simpática do Bistrô da Casa. Responda em frases naturais (sem tópicos), seja acolhedora e NUNCA invente horários.
Use as ferramentas para montar a resposta. É normal chamar mais de uma ferramenta na mesma pergunta.
NUNCA use frases meta como "vou buscar", "vou verificar", "vou conferir". Sempre entregue a informação completa na mesma resposta.

Regras de composição:
- "Vocês estão abertos agora?" ou "Estão abertos hoje?":
    • SEMPRE chame get_open_status_now para saber status, próxima abertura/fechamento.
    • EM SEGUIDA, SEMPRE chame get_programacao_do_dia(dia=hoje) e inclua a programação completa de hoje na mesma resposta.
    • Responda em uma única mensagem completa (status + horários + programação), evitando promessas de que ainda vai buscar algo.
- "Amanhã vocês funcionam?" ou "quais os horários amanhã": chame get_funcionamento_do_dia(dia=amanhã) e get_programacao_do_dia(dia=amanhã).
- "{dia} tem {evento}?": chame check_event_on_day(nomeEvento, dia).  
 • Se ocorrer, confirme e diga o horário.  
 • Se NÃO ocorrer, primeiro afirme quando esse evento acontece na semana (ex.: "Nosso café da manhã é servido aos sábados e domingos, das 10h às 13h").  
 • Em seguida, diga o que teremos no dia citado, usando get_programacao_do_dia(dia), em tom positivo (“mas amanhã estaremos abertos com cardápio completo...”).  
- "Quando/que dias tem {evento}?": chame get_event_info(nomeEvento).
    • Se HOJE for um dos dias, comece com "Hoje, temos {evento} a partir das {hora}."
    • Em seguida, SEMPRE use a ferramenta formatar_dias(dias) para transformar a lista de dias em texto humano (ex.: "de quarta a sábado").
    • Nunca invente resumos como "até sábado" ou "apenas no fim de semana". Apenas use o retorno de formatar_dias.
    • Se o evento for limitado (campo "limitado"), mencione "por tempo limitado".
- "como funciona {informacao}": chame buscar_informacoes(termo).
- "quais os horários de funcionamento": chame get_funcionamento_da_semana e, se fizer sentido, get_event_info para principais eventos.

Convenções:
- Ao falar de um dia específico, mencione "cardápio completo a partir das {hora}" (seg–sex 12:00; sáb–dom 13:00).
- Prefira frases positivas (“Hoje abrimos às … / A próxima abertura é …”) e ofereça alternativas.
- Pode usar um leve toque de entusiasmo quando adequado (ex.: “um mais gostoso que o outro”).
- Cumprimente com "Olá!" ou "Obrigado pelo contato" no início e finalize perguntando se precisa de mais algo.
- Quando a programação tiver vários horários/eventos no mesmo dia, organize em tópicos ou lista com horários claros.
- Quando houver apenas uma ou duas informações simples, prefira frases corridas.
`.trim();

/**
 * ============================
 * Tools (granulares, componíveis)
 * ============================
 */
enum toolTypes {
  FUNCTION = 'function',
}

const tools: Tool[] = [
  {
    type: toolTypes.FUNCTION,
    name: 'get_now',
    description:
      'Retorna a data/hora local e o índice do dia da semana (0=dom..6=sáb).',
    parameters: { type: 'object', properties: {} },
    strict: false,
  },
  {
    type: toolTypes.FUNCTION,
    name: 'get_open_status_now',
    description:
      'Indica se está aberto agora e a próxima abertura/fechamento de HOJE.',
    parameters: { type: 'object', properties: {} },
    strict: false,
  },
  {
    type: toolTypes.FUNCTION,
    name: 'get_funcionamento_do_dia',
    description:
      'Retorna as faixas de funcionamento de um dia (0=domingo..6=sábado).',
    parameters: {
      type: 'object',
      properties: { dia: { type: 'number', minimum: 0, maximum: 6 } },
      required: ['dia'],
    },
    strict: false,
  },
  {
    type: toolTypes.FUNCTION,
    name: 'get_programacao_do_dia',
    description:
      'Retorna um resumo da programação de um dia: executivo, fondue, música e "cardápio completo a partir de".',
    parameters: {
      type: 'object',
      properties: { dia: { type: 'number', minimum: 0, maximum: 6 } },
      required: ['dia'],
    },
    strict: false,
  },
  {
    type: toolTypes.FUNCTION,
    name: 'get_funcionamento_da_semana',
    description: 'Retorna as faixas de funcionamento de toda a semana (0..6).',
    parameters: { type: 'object', properties: {} },
    strict: false,
  },
  {
    type: toolTypes.FUNCTION,
    name: 'get_event_info',
    description:
      'Retorna em quais dias e horários um evento/programa acontece e a descrição.',
    parameters: {
      type: 'object',
      properties: { nomeEvento: { type: 'string' } },
      required: ['nomeEvento'],
    },
    strict: false,
  },
  {
    type: toolTypes.FUNCTION,
    name: 'check_event_on_day',
    description:
      'Verifica se um evento/programa ocorre num dia específico e retorna as faixas.',
    parameters: {
      type: 'object',
      properties: {
        nomeEvento: { type: 'string' },
        dia: { type: 'number', minimum: 0, maximum: 6 },
      },
      required: ['nomeEvento', 'dia'],
    },
    strict: false,
  },
  {
    type: toolTypes.FUNCTION,
    name: 'buscar_informacoes',
    description:
      'Busca em "informacoes" por termos como aniversário, pet friendly, etc.',
    parameters: {
      type: 'object',
      properties: { termo: { type: 'string' } },
      required: ['termo'],
    },
    strict: false,
  },
  {
    /** NOVA TOOL: compacta lista de dias em texto humano */
    type: toolTypes.FUNCTION,
    name: 'formatar_dias',
    description:
      'Recebe uma lista de dias da semana (por extenso, minúsculo) e retorna um texto compacto (ex.: "de quarta a sábado").',
    parameters: {
      type: 'object',
      properties: { dias: { type: 'array', items: { type: 'string' } } },
      required: ['dias'],
    },
    strict: false,
  },
];

/**
 * ============================
 * Service
 * ============================
 */
@Injectable()
export class AtendenteService {
  private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  async perguntarProAtendente(prompt: string): Promise<string> {
    const now = nowPartsInTZ();
    const dataHoje = now.isoLocal.split('T')[0];
    const promptComData = `Hoje é ${dataHoje} (${idxToNome[now.weekdayIndex]}). ${prompt}`;

    const input: ResponseInput = [
      { role: 'system', content: SYSTEM_INSTRUCTIONS },
      { role: 'user', content: promptComData },
    ];

    let resp = await this.openai.responses.create({
      model: 'gpt-4o-mini',
      input,
      tools,
      tool_choice: 'auto',
    });

    for (const output of resp.output) {
      if (output.type !== 'function_call') continue;

      const name = output.name;
      const args = output.arguments ? JSON.parse(output.arguments) : {};
      const result = this.callFunction(name, args);

      input.push({
        role: 'assistant',
        content: `Chamando função ${name} com argumentos: ${output.arguments}`,
      });
      input.push({
        role: 'user',
        content: `Resultado da função ${name}: ${JSON.stringify(result)}`,
      });
    }

    resp = await this.openai.responses.create({
      model: 'gpt-4o-mini',
      input,
      tools,
      tool_choice: 'auto',
    });

    return resp.output_text ?? '';
  }

  /** Router das tools */
  private callFunction(name: string, args: any) {
    switch (name) {
      case 'get_now':
        return this.toolGetNow();
      case 'get_open_status_now':
        return this.toolGetOpenStatusNow();
      case 'get_funcionamento_do_dia':
        return this.toolGetFuncionamentoDoDia(args.dia);
      case 'get_programacao_do_dia':
        return this.toolGetProgramacaoDoDia(args.dia);
      case 'get_funcionamento_da_semana':
        return this.toolGetFuncionamentoDaSemana();
      case 'get_event_info':
        return this.toolGetEventInfo(args.nomeEvento);
      case 'check_event_on_day':
        return this.toolCheckEventOnDay(args.nomeEvento, args.dia);
      case 'buscar_informacoes':
        return this.toolBuscarInformacoes(args.termo);
      case 'formatar_dias':
        return this.toolFormatarDias(args.dias);
      default:
        return { error: 'função desconhecida' };
    }
  }

  /**
   * ============================
   * Implementações
   * ============================
   */
  private toolGetNow() {
    return nowPartsInTZ();
  }

  private toolGetOpenStatusNow() {
    const now = nowPartsInTZ();
    const dia = now.weekdayIndex;
    const faixas = funcionamentoDoDia(dia);
    const t = now.hour * 60 + now.minute;

    let aberto = false;
    let proxFechamento: string | null = null;
    let proxAbertura: string | null = null;

    for (const f of faixas) {
      const ini = horaToMin(f.inicio);
      const fim = f.fim ? horaToMin(f.fim) : Infinity;
      if (t >= ini && t < fim) {
        aberto = true;
        proxFechamento = f.fim ?? null;
        break;
      }
      if (t < ini && !proxAbertura) proxAbertura = f.inicio;
    }

    if (!aberto && !proxAbertura) {
      const amanha = (dia + 1) % 7;
      const faixasAmanha = funcionamentoDoDia(amanha);
      if (faixasAmanha.length)
        proxAbertura = `amanhã às ${faixasAmanha[0].inicio}`;
    }

    return {
      agoraLocal: now.isoLocal,
      dia: idxToNome[dia],
      aberto,
      proximaAbertura: proxAbertura,
      proximoFechamento: proxFechamento,
    };
  }

  private toolGetFuncionamentoDoDia(dia: number) {
    return { dia: idxToNome[dia], faixas: funcionamentoDoDia(dia) };
  }

  private toolGetProgramacaoDoDia(dia: number) {
    const inicioCardapio = cardapioCompletoAPartir(dia);
    const evs = programacao
      .map((p) => ({ nomes: p.nomes, faixas: faixasEventoNoDia(p, dia) }))
      .filter((x) => x.faixas.length > 0);
    const pick = (label: string) =>
      evs.find((e) => e.nomes.some((n) => norm(n).includes(norm(label))));
    const executivo = pick('executivo')?.faixas ?? null;
    const fondue = pick('fondue')?.faixas ?? null;
    const musica = pick('musica')?.faixas ?? null;

    return {
      dia: idxToNome[dia],
      cardapioCompletoAPartir: inicioCardapio,
      executivo,
      fondue,
      musica,
    };
  }

  private toolGetFuncionamentoDaSemana() {
    return {
      semana: [0, 1, 2, 3, 4, 5, 6].map((d) => ({
        dia: idxToNome[d],
        faixas: funcionamentoDoDia(d),
      })),
    };
  }

  private toolGetEventInfo(nomeEvento: string) {
    const ev = eventoPorTermo(nomeEvento);
    if (!ev) return { encontrado: false };
    return {
      encontrado: true,
      evento: ev.nomes,
      descricao: ev.descricao,
      limitado: !!ev.limitado,
      dias: ev.horarios.map((h) => ({ dia: h.nome, faixas: h.horarios })),
    };
  }

  private toolCheckEventOnDay(nomeEvento: string, dia: number) {
    const ev = eventoPorTermo(nomeEvento);
    if (!ev) return { encontrado: false };
    const faixas = faixasEventoNoDia(ev, dia);
    return {
      encontrado: true,
      evento: ev.nomes,
      ocorreNoDia: faixas.length > 0,
      faixasNoDia: faixas,
    };
  }

  private toolBuscarInformacoes(termo: string) {
    const hit = buscarInfo(termo);
    if (!hit) return { encontrado: false };
    return { encontrado: true, ...hit };
  }

  /** NOVA: expõe o compactador de dias como tool */
  private toolFormatarDias(dias: string[]) {
    return { texto: formatarDias(dias) };
  }
}
