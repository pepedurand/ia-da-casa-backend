import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { ResponseInput, Tool } from 'openai/resources/responses/responses';

const BUSINESS_TZ = process.env.BUSINESS_TZ || 'America/Sao_Paulo';

// Novo tipo de funcionamento
type FuncSlot = { abre: string; fecha: string };
type Evento = { names: string[]; dias: number[]; abre: string; fecha: string };

export const FUNCIONAMENTO: Record<number, FuncSlot[]> = {
  0: [
    { abre: '10:00', fecha: '13:00' },
    { abre: '13:00', fecha: '18:00' },
  ],
  1: [{ abre: '12:00', fecha: '16:00' }],
  2: [{ abre: '12:00', fecha: '16:00' }],
  3: [
    { abre: '12:00', fecha: '15:00' },
    { abre: '18:00', fecha: '23:00' },
  ],
  4: [{ abre: '12:00', fecha: '23:00' }],
  5: [{ abre: '12:00', fecha: '23:00' }],
  6: [
    { abre: '10:00', fecha: '13:00' },
    { abre: '13:00', fecha: '23:00' },
  ],
};

export const EVENTOS: Evento[] = [
  {
    names: ['Café da manhã', 'café', 'breakfast'],
    dias: [0, 6],
    abre: '10:00',
    fecha: '13:00',
  },
  {
    names: ['Menu executivo', 'executivo', 'prato do dia', 'almoço executivo'],
    dias: [1, 2, 3, 4, 5],
    abre: '12:00',
    fecha: '16:00',
  },
  {
    names: ['Fondue da Glória', 'fondue', 'fundue', 'fondue da casa'],
    dias: [3, 4, 5],
    abre: '19:00',
    fecha: '23:00',
  },
  {
    names: ['Música ao vivo', 'música', 'show', 'som ao vivo'],
    dias: [5],
    abre: '19:00',
    fecha: '23:00',
  },
  {
    names: ['Jantar', 'dinner', 'refeição noturna'],
    dias: [3, 4, 5, 6],
    abre: '18:00',
    fecha: '23:00',
  },
  {
    names: ['Almoço e jantar', 'almoço', 'lunch'],
    dias: [6],
    abre: '13:00',
    fecha: '23:00',
  },
];

const SYSTEM_INSTRUCTIONS = `
Você é uma atendente simpática e prestativa do restaurante Bistrô da Casa. Use sempre as funções disponíveis para responder com precisão.

Nunca invente informações sobre horários ou eventos. Utilize as funções corretamente.
Sempre cumprimente o cliente com alegria, com um "Olá!" ou "Obrigado pelo contato".
Evite responder em tópicos, prefira frases.
Ao ser referir a eventos ou horário, prefira o termo programação.
Pergunte se precisar de mais informações.
Evite dizer que estamos fechados.

### Quando usar as funções:

- **get_open_status**: Use quando perguntarem “vocês estão abertos agora?” ou “qual o horário hoje?”. 
  Responda se está aberto, a próxima abertura/fechamento e a programação de hoje.

- **get_evento_info(nomeEvento)**:
  - Quando o cliente pergunta sobre um evento específico, como "quando tem fondue?", "tem música ao vivo?", "tem menu executivo?", "tem café da manhã?", "tem almoço ou jantar?".
  - Mesmo que o cliente use palavras genéricas como "vocês têm executivo?", "tem fondue hoje?", "e jantar?", "servem almoço?", chame a função passando o nome do evento citado.
  - Sempre que uma pergunta citar algo do tipo: fondue, música ao vivo, menu executivo, café da manhã, almoço, jantar — chame "get_evento_info".

- **get_programacao(dias)**: Use quando perguntarem “que horas vocês abrem?”, “qual o horário de funcionamento?”, 
  ou qualquer pergunta genérica sobre abertura/fechamento sem referência a “hoje” ou “agora”. 
  Nesse caso, mostre a programação completa da semana (funcionamento + eventos).
  - Quando houver "observacoes.destaquesNoite", destaque em frase única os dois marcos: 
  “a partir das {inicio} servimos o cardápio completo (jantar); e a partir das {inicio} também o Fondue da Glória.”


- **Sobre "amanhã"**:  
  Se o cliente perguntar algo como “que horas vocês abrem amanhã?” ou “qual a programação de amanhã?”, 
  você deve calcular o dia real de amanhã (new Date().getDay() + 1) e chamar "get_programacao" passando esse dia da semana.  
  Nunca presuma o dia de amanhã, sempre use a data real atual como referência.

### Como responder:

- Sempre responda de forma clara, acolhedora e simpática.
- Quando algo não estiver disponível, ofereça alternativas ou destaque outras atrações.
- Ao listar programação, organize por dia e horário.

#### Exemplos:

**Cliente**: "Vocês têm menu executivo?"  
**Você**: Temos sim! O Menu Executivo é servido de segunda a sexta, das 12h às 16h. Uma ótima opção para o almoço! 😋

**Cliente**: "Qual a programação do fim de semana?"  
**Você**: Neste fim de semana temos:  
Sábado: Café da manhã das 10h às 13h, almoço e jantar das 13h às 23h.  
Domingo: Café da manhã das 10h às 13h e almoço das 13h às 18h.  

**Cliente**: "Que horas vocês abrem amanhã?"  
**Você**: Amanhã, quarta-feira, abrimos das 12h às 15h e depois das 18h às 23h, com nosso fondue da Glória no jantar.  
`.trim();

enum toolTypes {
  FUNCTION = 'function',
}

const tools: Tool[] = [
  {
    type: toolTypes.FUNCTION,
    name: 'get_open_status',
    description:
      'Retorna se o restaurante está aberto agora e os horários do dia.',
    parameters: {
      type: 'object',
      properties: {
        isoDatetime: { type: 'string' },
      },
      required: ['isoDatetime'],
    },
    strict: false,
  },
  {
    type: toolTypes.FUNCTION,
    name: 'get_evento_info',
    description:
      'Retorna dias e horários em que um evento (como fondue) acontece.',
    parameters: {
      type: 'object',
      properties: {
        nomeEvento: { type: 'string' },
      },
      required: ['nomeEvento'],
    },
    strict: false,
  },
  {
    type: toolTypes.FUNCTION,
    name: 'get_programacao',
    strict: false,
    description:
      'Retorna os eventos e horários de funcionamento de dias específicos (ex: fim de semana).',
    parameters: {
      type: 'object',
      properties: {
        dias: {
          type: 'array',
          items: { type: 'number', minimum: 0, maximum: 6 },
          description: 'Array com os dias da semana (0=domingo, 6=sábado)',
        },
      },
      required: [],
    },
  },
];

@Injectable()
export class AtendenteService {
  private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  async perguntarProAtendente(prompt: string): Promise<string> {
    const input: ResponseInput = [
      { role: 'system', content: SYSTEM_INSTRUCTIONS },
      { role: 'user', content: prompt },
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
      const args = JSON.parse(output.arguments);
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

  private callFunction(name: string, args: any) {
    console.log(
      `Chamando função ${name} com argumentos: ${JSON.stringify(args)}`,
    );
    switch (name) {
      case 'get_open_status':
        return this.verificaSeEstaAberto();
      case 'get_evento_info':
        return this.getEventoInfo(args.nomeEvento);
      case 'get_programacao':
        return this.getProgramacao(args.dias);
      default:
        return { error: 'Função desconhecida' };
    }
  }

  private verificaSeEstaAberto() {
    const now = this.nowPartsInTZ(); // usa BUSINESS_TZ
    const diaSemana = now.weekdayIndex;
    const minutosAgora = now.hour * 60 + now.minute;
    const hoje = FUNCIONAMENTO[diaSemana] || [];

    let abertoAgora = false;
    let proximaAbertura: string | null = null;
    let proximoFechamento: string | null = null;

    const hhmmParaMinutos = (hhmm: string) => {
      const [h, m] = hhmm.split(':').map(Number);
      return h * 60 + m;
    };

    for (const slot of hoje) {
      const ini = hhmmParaMinutos(slot.abre);
      const fim = hhmmParaMinutos(slot.fecha);

      if (minutosAgora >= ini && minutosAgora < fim) {
        abertoAgora = true;
        proximoFechamento = slot.fecha;
        break;
      }
      if (minutosAgora < ini && !proximaAbertura) {
        proximaAbertura = slot.abre;
      }
    }

    if (!abertoAgora && !proximaAbertura) {
      const amanha = (diaSemana + 1) % 7;
      const slotsAmanha = FUNCIONAMENTO[amanha] || [];
      if (slotsAmanha.length) {
        proximaAbertura = `amanhã às ${slotsAmanha[0].abre}`;
      }
    }

    // 👉 Anexa a programação de hoje
    const programacaoHoje = this.getProgramacaoDoDia(diaSemana);

    return {
      agoraLocal: now.isoLocal,
      timezone: BUSINESS_TZ,
      diaSemana,
      abertoAgora,
      hoje,
      proximaAbertura,
      proximoFechamento,
      programacaoHoje,
    };
  }

  private getEventoInfo(nome: string) {
    const normaliza = (s: string) =>
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    const nomeNormalizado = normaliza(nome);

    let evento = EVENTOS.find((e) =>
      e.names.some((n) => normaliza(n).includes(nomeNormalizado)),
    );

    if (!evento) {
      const palavras = nomeNormalizado.split(/\s+/);
      evento = EVENTOS.find((e) =>
        palavras.some((p) => e.names.some((n) => normaliza(n).includes(p))),
      );
    }

    if (!evento) {
      return { encontrado: false };
    }

    const diasMap = [
      'domingo',
      'segunda',
      'terça',
      'quarta',
      'quinta',
      'sexta',
      'sábado',
    ];
    const dias = evento.dias.map((i) => diasMap[i]);

    return {
      encontrado: true,
      nome: evento.names,
      dias,
      horario: { abre: evento.abre, fecha: evento.fecha },
    };
  }

  private getProgramacao(dias: number[] = [0, 1, 2, 3, 4, 5, 6]) {
    const diasMap = [
      'domingo',
      'segunda',
      'terça',
      'quarta',
      'quinta',
      'sexta',
      'sábado',
    ];

    const programacao = dias.map((dia) => {
      const eventosHoje = EVENTOS.filter((evento) => evento.dias.includes(dia));
      const funcionamentoHoje = FUNCIONAMENTO[dia] || [];

      return {
        dia,
        nome: diasMap[dia],
        funcionamento: funcionamentoHoje,
        eventos: eventosHoje.map((e) => ({
          nome: e.names,
          abre: e.abre,
          fecha: e.fecha,
        })),
      };
    });

    return { programacao };
  }

  private getProgramacaoDoDia(dia: number) {
    const diasMap = [
      'domingo',
      'segunda',
      'terça',
      'quarta',
      'quinta',
      'sexta',
      'sábado',
    ];
    const funcionamentoHoje = FUNCIONAMENTO[dia] || [];
    const eventosHoje = EVENTOS.filter((e) => e.dias.includes(dia));

    const eventos = eventosHoje.map((e) => ({
      nome: e.names,
      abre: e.abre,
      fecha: e.fecha,
    }));

    const temJantar = eventosHoje.find((e) =>
      e.names.some((n) => n.toLowerCase().includes('jantar')),
    );
    const temFondue = eventosHoje.find((e) =>
      e.names.some((n) => n.toLowerCase().includes('fondue')),
    );

    const observacoes: {
      destaquesNoite?: Array<{ inicio: string; descricao: string }>;
    } = {};

    if (temJantar && temFondue) {
      observacoes.destaquesNoite = [
        { inicio: temJantar.abre, descricao: 'Cardápio completo (jantar)' },
        { inicio: temFondue.abre, descricao: 'Fondue da Glória' },
      ];
    }

    return {
      dia,
      nomeDia: diasMap[dia],
      funcionamento: funcionamentoHoje,
      eventos,
      observacoes, // 👈 novo campo
    };
  }

  private nowPartsInTZ(tz = BUSINESS_TZ) {
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
    }).formatToParts(new Date());

    const get = (type: string) => parts.find((p) => p.type === type)?.value!;
    const weekdayShort = get('weekday'); // Sun, Mon, ...
    const mapWeek: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };

    const y = get('year'),
      m = get('month'),
      d = get('day');
    const h = get('hour'),
      min = get('minute'),
      s = get('second');

    // “ISO local” útil para logs
    const isoLocal = `${y}-${m}-${d}T${h}:${min}:${s}`;
    return {
      weekdayIndex: mapWeek[weekdayShort],
      hour: Number(h),
      minute: Number(min),
      isoLocal,
    };
  }
}
