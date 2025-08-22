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
      { inicio: '12:00', fim: '16:00' }, // corrigido de 15:00 -> 16:00
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
        horarios: [{ inicio: '12:00', fim: '16:00' }],
      }, // corrigido
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
      'Experiência de fondue com opções de queijo, queijo trufado, queijo vegano, carne e chocolate. Todas as opções servem duas pessoas. Por tempo limitado.',
  },
  {
    nomes: [
      'musica ao vivo',
      'musica instrumental',
      'musica instrumental ao vivo',
    ],
    horarios: [{ nome: DiasDaSemana.SEXTA, horarios: [{ inicio: '19:00' }] }],
    descricao: 'Música ao vivo instrumental todas as sextas a partir das 19h.',
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
  {
    nomes: [
      'comida vegetarina',
      'comida vegana',
      'opções vegetarianas',
      'opcoes veganas',
      'vegetariana',
      'vegana',
    ],
    observacoes: [
      'Temos opções vegetarianas e veganas e voce pode conferir todas no nosso cardápio digital que fica no nosso site',
      'Para conferir as opções veganas ou vegetarianas, basta acessar o link e ir em cardápio digital',
    ],
  },
];

/**
 * ============================
 * Utils (determinísticos)
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
 * System prompt (roteamento por IA)
 * ============================
 */
const SYSTEM_INSTRUCTIONS = `
Você é uma atendente simpática do Bistrô da Casa. Responda em frases naturais (sem tópicos), seja acolhedora e NUNCA invente horários.
Use as ferramentas para montar a resposta. É normal chamar mais de uma ferramenta na mesma pergunta.
NUNCA use frases meta como "vou buscar", "vou verificar", "vou conferir". Sempre entregue a informação completa na mesma resposta.

ROTEAMENTO POR IA (sempre primeiro):
- SEMPRE chame primeiro classificar_intencao com {comando, evento, dia?}.
  • comando ∈ {"quando","que_dias","como_funciona","tem_no_dia"}.
  • evento é o programa ou tema (ex.: "café da manhã", "executivo", "fondue", "reservas", "formas de pagamento").
  • dia é opcional (0=dom..6=sáb) quando a pergunta for específica (ex.: "hoje", "amanhã", "quinta").

REGRAS ESPECIAIS (prioridade alta):
- Perguntas sobre RESERVA (contendo "reserva", "reservar", "precisa de reserva", "é obrigatório reservar?"):
  → classificar como {comando:"como_funciona", evento:"reservas"}.
  → Use apenas buscar_informacoes("reservas"). NÃO mencione horários, programação ou se estamos abertos.
  → Responda de forma direta: “Atendemos com e sem reserva… link… instruções curtas”.

- Perguntas informativas (endereço, estacionamento, como chegar, formas de pagamento, pet friendly, rolha, aniversários, eventos particulares etc.):
  → {comando:"como_funciona", evento:"<termo>"} e use buscar_informacoes.
  → NÃO traga horários, a não ser que a pergunta peça explicitamente.

- Perguntas sobre "fim/final de semana" ou "fds":
    • Considere SEMPRE os dias sábado (6) e domingo (0) — NUNCA inclua sexta-feira.
    • Chame get_programacao_do_dia(dia=6) e get_programacao_do_dia(dia=0).
    • Ao montar a resposta, cite explicitamente:
      - sábado: cardápio completo a partir de {hora}, e todos os itens (ex.: café da manhã se houver, fondue, música etc.)
      - domingo: idem
    • Se houver café da manhã em algum dos dias, ELE DEVE SER MENCIONADO.

- Perguntas gerais (ex.: "qual o horário de funcionamento?", "que dia abrem?", "qual a programação de vocês?", "como funciona o bistrô da casa?"):
    • Classifique como {comando:"como_funciona", evento:"visao_geral"}.
    • Chame get_visao_geral.
    • Responda listando:
      1) Horários da semana (dom→sáb) com faixas.
      2) Principais eventos (café da manhã, menu/cardápio completo, executivo, fondue, música), com dias compactos e seu horário padrão.
      3) Se fizer sentido, finalize com link de reservas/valores (buscar_informacoes) em 1 frase.

- Perguntas sobre "cardápio" / "menu" (ex.: "qual o cardápio?", "o que tem no cardápio?"):
    • Classifique como {comando:"como_funciona", evento:"cardapio_geral"}.
    • Chame get_cardapio_geral (NÃO use programação de hoje).
    • Responda com: link de cardápios/valores e visão geral dos programas (café da manhã, menu/cardápio completo, executivo, fondue), com dias compactos e horário padrão.


FLUXOS padrão:
- comando in {"quando","que_dias"}:
    • Use apenas get_event_info(nomeEvento) e, se necessário, formatar_dias(dias).
    • NÃO compare com o dia atual e NÃO mencione programação de hoje.
- comando == "como_funciona":
    • Se for um programa do cardápio (café da manhã, executivo, fondue, jantar etc.), use get_event_info(nomeEvento) para trazer horários e descrição.
    • Se for uma informação institucional (reservas, endereço, pagamento, estacionamento, pet friendly, rolha etc.), use buscar_informacoes(termo).
comando == "tem_no_dia":
   • SEMPRE chame, nesta ordem: 
     1) check_event_on_day(nomeEvento, dia)
     2) get_event_info(nomeEvento)
     3) get_programacao_do_dia(dia)
   • Se ocorrer:
     - Comece confirmando: “Sim, temos {evento} {no dia}, {faixas do dia}.”
     - Em seguida, traga a visão do DIA: “Além disso, {no dia} temos: {programação do dia: café da manhã, cardápio/menu completo, executivo, fondue, música…}”
     - Por fim, traga a visão GERAL do EVENTO (sem depender do dia): “O {evento} acontece {diasCompacto} {e, se aplicável, horário padrão (intervalo ou a partir de …)}.”
   • Se NÃO ocorrer:
     - Diga que não ocorre no dia perguntado.
     - Em seguida, traga a visão GERAL do EVENTO (diasCompacto horário padrão).
     - Depois, sugira a programação do DIA perguntado com tom positivo (get_programacao_do_dia).
- "Vocês estão abertos agora?" / "Estão abertos hoje?":
    • SEMPRE chame get_open_status_now e depois get_programacao_do_dia(dia=hoje).
- "Amanhã vocês funcionam?" / "quais os horários amanhã":
    • chame get_funcionamento_do_dia(dia=amanhã) e get_programacao_do_dia(dia=amanhã).
- "quais os horários de funcionamento":
    • chame get_funcionamento_da_semana e, se fizer sentido, get_event_info para principais eventos.

EXEMPLOS de classificação:
- "Precisa fazer reserva?" → {comando:"como_funciona", evento:"reservas"}
- "Como faço pra reservar?" → {comando:"como_funciona", evento:"reservas"}
- "Como funciona o café da manhã?" → {comando:"como_funciona", evento:"café da manhã"} → get_event_info
- "Vocês aceitam Alelo?" → {comando:"como_funciona", evento:"formas de pagamento"}
- "Tem café da manhã amanhã?" → {comando:"tem_no_dia", evento:"café da manhã", dia: (amanhã)}
- "Quais os dias do fondue?" → {comando:"que_dias", evento:"fondue"}
- "qual o horário de funcionamento?" → {comando:"como_funciona", evento:"visao_geral"}
- "qual a programação de vocês?" → {comando:"como_funciona", evento:"visao_geral"}
- "que dia abrem?" → {comando:"como_funciona", evento:"visao_geral"}
- "como funciona o bistrô da casa?" → {comando:"como_funciona", evento:"visao_geral"}
- "qual o cardápio?" → {comando:"como_funciona", evento:"cardapio_geral"}
- "me manda o cardápio" → {comando:"como_funciona", evento:"cardapio_geral"}
- "menu de vocês" → {comando:"como_funciona", evento:"cardapio_geral"}


Convenções de linguagem:
- Ao falar de um dia específico, mencione "cardápio completo a partir das {hora}" (seg–sex 12:00; sáb–dom 13:00).
- Prefira frases positivas (“Hoje abrimos às … / A próxima abertura é …”) e ofereça alternativas.
- Ao listar programação do dia, mantenha esta ordem quando existir: café da manhã → cardápio/menu completo → executivo → fondue → música.
- Cumprimente com "Olá!" ou "Obrigado pelo contato" no início e finalize perguntando se precisa de mais algo.
- Quando houver poucas informações, prefira frases corridas; quando houver várias, pode listar.

FORMATO sugerido para RESERVAS:
- "Atendemos com e sem reserva. Para garantir sua mesa, acesse https://linktr.ee/bistrodacasa → 'Reserva online'. Se não aparecer data, é porque não há disponibilidade no sistema. Também atendemos por ordem de chegada."
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
  // IA decide {comando, evento, dia?}
  {
    type: toolTypes.FUNCTION,
    name: 'get_cardapio_geral',
    description:
      'Retorna uma visão geral do cardápio: link de cardápios/valores e resumo dos programas (café da manhã, cardápio/menu completo, executivo, fondue) com dias compactos e horário padrão.',
    parameters: { type: 'object', properties: {} },
    strict: false,
  },
  {
    type: toolTypes.FUNCTION,
    name: 'get_visao_geral',
    description:
      'Retorna visão geral: funcionamento da semana (0..6) e resumo de todos os eventos (dias compactos + horário padrão + descrição).',
    parameters: { type: 'object', properties: {} },
    strict: false,
  },
  {
    type: toolTypes.FUNCTION,
    name: 'classificar_intencao',
    description:
      'Classifique a pergunta do usuário em {comando, evento, dia?}. ' +
      'comando ∈ {"quando","que_dias","como_funciona","tem_no_dia"}. ' +
      'evento é o nome do programa (ex.: "café da manhã", "executivo", "fondue"). ' +
      'dia é opcional (0=dom..6=sáb) quando a pergunta for específica (ex.: "hoje", "amanhã", "quinta").',
    parameters: {
      type: 'object',
      properties: {
        comando: {
          type: 'string',
          enum: ['quando', 'que_dias', 'como_funciona', 'tem_no_dia'],
        },
        evento: { type: 'string' },
        dia: { type: 'number', minimum: 0, maximum: 6 },
      },
      required: ['comando', 'evento'],
    },
    strict: false,
  },

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
      'Retorna em quais dias e horários um evento acontece e a descrição. Use isto para perguntas "quando/que dias". NÃO use check_event_on_day nesses casos. Não inclua programação de outros itens.',
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
    type: toolTypes.FUNCTION,
    name: 'formatar_dias',
    description:
      'Recebe uma lista de dias (por extenso) e retorna texto compacto (ex.: "de quarta a sábado").',
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

    let finalText = '';
    const MAX_HOPS = 5;

    for (let hop = 0; hop < MAX_HOPS; hop++) {
      const resp = await this.openai.responses.create({
        model: 'gpt-4o-mini',
        input,
        tools,
        tool_choice: 'auto',
      });

      // guarda texto final (se já veio)
      if (resp.output_text) finalText = resp.output_text;

      // pega todas as chamadas de função desta rodada
      const calls = (resp.output ?? []).filter(
        (o: any) => o.type === 'function_call',
      );
      if (!calls.length) break; // nada pra executar => encerra

      for (const call of calls) {
        if (call.type !== 'function_call') continue; // só processa chamadas de função
        const name = (call as any).name as string;
        let args: any = {};
        try {
          args = call.arguments ? JSON.parse(call.arguments) : {};
        } catch {
          args = {};
        }
        const result = this.callFunction(name, args);

        // mesmo padrão que você já usava (eco de entrada/saída da tool)
        input.push({
          role: 'assistant',
          content: `Chamando função ${name} com argumentos: ${call.arguments ?? '{}'}`,
        });
        input.push({
          role: 'user',
          content: `Resultado da função ${name}: ${JSON.stringify(result)}`,
        });
      }
    }

    return (
      finalText ||
      'Desculpe, não consegui interpretar sua pergunta agora. Pode reformular, por favor?'
    );
  }

  /** Router das tools */
  private callFunction(name: string, args: any) {
    switch (name) {
      case 'classificar_intencao':
        // ecoa exatamente o que a IA decidiu; a próxima rodada usará isso
        return { ...args };

      case 'get_now':
        return this.toolGetNow();

      case 'get_visao_geral':
        return this.toolGetVisaoGeral();

      case 'get_cardapio_geral':
        return this.toolGetCardapioGeral();

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

  private toolGetCardapioGeral() {
    const resumoEvento = (nome: string) => {
      const ev = eventoPorTermo(nome);
      if (!ev) return null;

      const diasSemana = ev.horarios.map((h) => h.nome);
      const diasCompacto = formatarDias(diasSemana);

      const todasFaixas = ev.horarios.flatMap((h) => h.horarios);
      let horarioPadrao: {
        tipo: 'intervalo' | 'apartir' | null;
        inicio?: string;
        fim?: string;
      } = { tipo: null };

      if (todasFaixas.length > 0) {
        const mesmoInicio = todasFaixas.every(
          (f) => f.inicio === todasFaixas[0].inicio,
        );
        const mesmoFim = todasFaixas.every(
          (f) => (f.fim ?? null) === (todasFaixas[0].fim ?? null),
        );
        if (mesmoInicio && mesmoFim) {
          if (todasFaixas[0].fim) {
            horarioPadrao = {
              tipo: 'intervalo',
              inicio: todasFaixas[0].inicio,
              fim: todasFaixas[0].fim,
            };
          } else {
            horarioPadrao = { tipo: 'apartir', inicio: todasFaixas[0].inicio };
          }
        }
      }

      return {
        titulo: ev.nomes[0],
        sinônimos: ev.nomes,
        descricao: ev.descricao,
        limitado: !!ev.limitado,
        diasCompacto,
        horarioPadrao,
      };
    };

    // Resumos que interessam para "cardápio"
    const cafe = resumoEvento('café da manhã') ?? resumoEvento('cafe');
    const executivo = resumoEvento('executivo');
    const cardapio =
      resumoEvento('cardapio completo') ?? resumoEvento('menu completo');
    const fondue = resumoEvento('fondue');

    // Links úteis de cardápio/valores
    const linkCardapio = buscarInfo('cardapio') ?? buscarInfo('valores');
    const cardapioLink = linkCardapio?.observacoes?.[0] ?? null;

    return {
      linkCardapio: cardapioLink, // 👈 sempre volta com o link
      programas: [cafe, cardapio, executivo, fondue].filter(Boolean),
    };
  }

  private toolGetVisaoGeral() {
    // 1) Funcionamento da semana
    const semana = [0, 1, 2, 3, 4, 5, 6].map((d) => ({
      dia: idxToNome[d],
      faixas: funcionamentoDoDia(d),
    }));

    // 2) Resumo de eventos
    const eventos = programacao.map((ev) => {
      const diasSemana = ev.horarios.map((h) => h.nome); // ["sábado","domingo", ...]
      const diasCompacto = formatarDias(diasSemana);

      const todasFaixas = ev.horarios.flatMap((h) => h.horarios);
      let horarioPadrao: {
        tipo: 'intervalo' | 'apartir' | null;
        inicio?: string;
        fim?: string;
      } = { tipo: null };

      if (todasFaixas.length > 0) {
        const mesmoInicio = todasFaixas.every(
          (f) => f.inicio === todasFaixas[0].inicio,
        );
        const mesmoFim = todasFaixas.every(
          (f) => (f.fim ?? null) === (todasFaixas[0].fim ?? null),
        );
        if (mesmoInicio && mesmoFim) {
          if (todasFaixas[0].fim) {
            horarioPadrao = {
              tipo: 'intervalo',
              inicio: todasFaixas[0].inicio,
              fim: todasFaixas[0].fim,
            };
          } else {
            horarioPadrao = { tipo: 'apartir', inicio: todasFaixas[0].inicio };
          }
        }
      }

      return {
        nomes: ev.nomes, // sinônimos
        titulo: ev.nomes[0], // nome “principal”
        descricao: ev.descricao,
        limitado: !!ev.limitado,
        diasCompacto,
        horarioPadrao,
      };
    });

    // 3) (Opcional) Pegar links úteis de reservas/valores
    const reservas = buscarInfo('reservas');
    const valores = buscarInfo('cardapio') ?? buscarInfo('valores');

    return {
      funcionamentoSemana: semana,
      eventos,
      links: {
        reservas: reservas?.observacoes?.[0] ?? null,
        valores: valores?.observacoes?.[0] ?? null,
      },
    };
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
    const evs = programacao
      .map((p) => ({ nomes: p.nomes, faixas: faixasEventoNoDia(p, dia) }))
      .filter((x) => x.faixas.length > 0);

    const pick = (label: string) =>
      evs.find((e) => e.nomes.some((n) => norm(n).includes(norm(label))));

    const executivo = pick('executivo')?.faixas ?? null;
    const fondue = pick('fondue')?.faixas ?? null;
    const musica = pick('musica')?.faixas ?? null;
    const cafe = (pick('cafe') ?? pick('café da manhã'))?.faixas ?? null;
    const cardapio =
      (pick('menu completo') ?? pick('cardapio completo'))?.faixas ?? null;

    return {
      dia: idxToNome[dia],
      executivo,
      fondue,
      musica,
      cafe,
      cardapio,
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

    const diasSemana = ev.horarios.map((h) => h.nome); // ["sábado","domingo"]
    const diasCompacto = formatarDias(diasSemana);

    const todasFaixas = ev.horarios.flatMap((h) => h.horarios);
    let horarioPadrao: {
      tipo: 'intervalo' | 'apartir' | null;
      inicio?: string;
      fim?: string;
    } = { tipo: null };
    if (todasFaixas.length > 0) {
      const mesmoInicio = todasFaixas.every(
        (f) => f.inicio === todasFaixas[0].inicio,
      );
      const mesmoFim = todasFaixas.every(
        (f) => (f.fim ?? null) === (todasFaixas[0].fim ?? null),
      );
      if (mesmoInicio && mesmoFim) {
        if (todasFaixas[0].fim) {
          horarioPadrao = {
            tipo: 'intervalo',
            inicio: todasFaixas[0].inicio,
            fim: todasFaixas[0].fim,
          };
        } else {
          horarioPadrao = { tipo: 'apartir', inicio: todasFaixas[0].inicio };
        }
      }
    }

    return {
      encontrado: true,
      evento: ev.nomes,
      descricao: ev.descricao,
      limitado: !!ev.limitado,
      dias: ev.horarios.map((h) => ({ dia: h.nome, faixas: h.horarios })),
      diasCompacto,
      horarioPadrao,
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

  private toolFormatarDias(dias: string[]) {
    return { texto: formatarDias(dias) };
  }
}
