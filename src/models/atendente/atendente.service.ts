import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { ResponseInput, Tool } from 'openai/resources/responses/responses';

// Novo tipo de funcionamento
type FuncSlot = { abre: string; fecha: string };
type Evento = { name: string; dias: number[]; abre: string; fecha: string };

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
  { name: 'Café da manhã', dias: [0, 6], abre: '10:00', fecha: '13:00' },
  {
    name: 'Menu executivo',
    dias: [1, 2, 3, 4, 5],
    abre: '12:00',
    fecha: '16:00',
  },
  { name: 'Fondue da Glória', dias: [3, 4, 5], abre: '19:00', fecha: '23:00' },
  { name: 'Música ao vivo', dias: [5], abre: '19:00', fecha: '23:00' },
  { name: 'Jantar', dias: [3, 4, 5, 6], abre: '18:00', fecha: '23:00' },
  { name: 'Almoço e jantar', dias: [6], abre: '13:00', fecha: '23:00' },
];

const SYSTEM_INSTRUCTIONS = `
Você é uma atendente simpática e prestativa de um restaurante. Use sempre as funções disponíveis para responder com precisão.

Você nunca deve inventar informações sobre horários ou eventos. Use as funções para isso.

### Quando usar as funções:

- **get_open_status(isoDatetime)**:
  - Quando o cliente pergunta se o restaurante está aberto, ou quais são os horários de funcionamento.

- **get_evento_info(nomeEvento)**:
  - Quando o cliente pergunta sobre um evento específico, como "quando tem fondue?", "tem música ao vivo?", etc.
  - Mas também quando ele faz perguntas gerais como "qual a programação do final de semana?", "o que tem hoje?", "tem algum evento especial?", etc.
  - Nesses casos, você deve chamar a função para cada evento e montar uma resposta listando todos os que acontecem nas datas mencionadas (ex: sábado e domingo).

### Como responder:

- Sempre use linguagem simpática, clara e acolhedora.
- Quando algo não estiver disponível, ofereça alternativas.
- Ao listar programação de dias como fim de semana, organize por dia e horário.

Exemplo:

**Cliente**: Qual a programação do final de semana?  
**Você**: Neste fim de semana temos:
- Sábado:
  - Café da manhã das 10h às 13h
  - Almoço e jantar das 13h às 23h
- Domingo:
  - Café da manhã das 10h às 13h
  - Almoço das 13h às 18h

Se quiser, posso reservar sua mesa! 😊
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
    switch (name) {
      case 'get_open_status':
        return this.verificaSeEstaAberto(args.isoDatetime);
      case 'get_evento_info':
        return this.getEventoInfo(args.nomeEvento);
      case 'get_programacao':
        return this.getProgramacao(args.dias);
      default:
        return { error: 'Função desconhecida' };
    }
  }

  private verificaSeEstaAberto(isoDatetime: string) {
    const agora = new Date(isoDatetime);
    const diaSemana = agora.getDay();
    const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
    const hoje = FUNCIONAMENTO[diaSemana] || [];

    let abertoAgora = false;
    let proximaAbertura: string | null = null;
    let proximoFechamento: string | null = null;

    function hhmmParaMinutos(hhmm: string) {
      const [h, m] = hhmm.split(':').map(Number);
      return h * 60 + m;
    }

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

    return {
      agora: agora.toISOString(),
      diaSemana,
      abertoAgora,
      hoje,
      proximaAbertura,
      proximoFechamento,
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
      normaliza(e.name).includes(nomeNormalizado),
    );

    if (!evento) {
      const palavras = nomeNormalizado.split(/\s+/);
      evento = EVENTOS.find((e) =>
        palavras.some((p) => normaliza(e.name).includes(p)),
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
      nome: evento.name,
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
          nome: e.name,
          abre: e.abre,
          fecha: e.fecha,
        })),
      };
    });

    return { programacao };
  }
}
