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

Nunca invente informações sobre horários ou eventos. Utilize as funções corretamente.

### Quando usar as funções:

- **get_open_status(isoDatetime)**:
  - Quando o cliente pergunta se o restaurante está aberto agora ou qual o horário de funcionamento hoje.

- **get_evento_info(nomeEvento)**:
  - Quando o cliente pergunta sobre um evento específico, como "quando tem fondue?", "tem música ao vivo?", "tem menu executivo?", "tem café da manhã?", "tem almoço ou jantar?".
  - Mesmo que o cliente use palavras genéricas como "vocês têm executivo?", "tem fondue hoje?", "e jantar?", "servem almoço?", chame a função passando o nome do evento citado.
  - Sempre que uma pergunta citar algo do tipo: fondue, música ao vivo, menu executivo, café da manhã, almoço, jantar — chame "get_evento_info".

- **get_programacao(dias)**:
  - Quando perguntarem algo como "qual a programação do fim de semana?", "tem algo hoje?", "o que acontece amanhã?", "tem evento no sábado ou domingo?", etc.
  - Chame essa função para montar uma resposta com os eventos e horários dos dias mencionados (ou todos se não forem especificados).

### Como responder:

- Sempre responda de forma clara, acolhedora e simpática.
- Quando algo não estiver disponível, ofereça alternativas ou destaque outras atrações.
- Ao listar programação, organize por dia e horário.

#### Exemplos:

**Cliente**: "Vocês têm menu executivo?"  
**Você**: Temos sim! O Menu Executivo é servido de segunda a sexta, das 12h às 16h. Uma ótima opção para o almoço! 😋

**Cliente**: "Qual a programação do fim de semana?"  
**Você**: Neste fim de semana temos:
- Sábado: Café da manhã das 10h às 13h, almoço e jantar das 13h às 23h.
- Domingo: Café da manhã das 10h às 13h e almoço das 13h às 18h.

Posso reservar uma mesa para você? 😊
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
