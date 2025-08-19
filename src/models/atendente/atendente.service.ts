import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { FunctionTool } from 'openai/resources/beta/assistants';
import { ResponseInput } from 'openai/resources/responses/responses';

export type Extra = {
  abre: string;
  fecha: string;
  name: string;
};

export type Slot = {
  abre: string;
  fecha: string;
  extras?: Extra[];
};

export const HORARIOS: Record<number, Slot[]> = {
  0: [
    // Domingo
    {
      abre: '10:00',
      fecha: '13:00',
      extras: [{ abre: '10:00', fecha: '13:00', name: 'Café da manhã' }],
    },
    {
      abre: '13:00',
      fecha: '18:00',
      extras: [{ abre: '13:00', fecha: '18:00', name: 'Almoço' }],
    },
  ],
  1: [
    // Segunda
    {
      abre: '12:00',
      fecha: '16:00',
      extras: [{ abre: '12:00', fecha: '16:00', name: 'Menu executivo' }],
    },
  ],
  2: [
    // Terça
    {
      abre: '12:00',
      fecha: '16:00',
      extras: [{ abre: '12:00', fecha: '16:00', name: 'Menu executivo' }],
    },
  ],
  3: [
    // Quarta
    {
      abre: '12:00',
      fecha: '15:00',
      extras: [{ abre: '12:00', fecha: '15:00', name: 'Menu executivo' }],
    },
    {
      abre: '18:00',
      fecha: '23:00',
      extras: [
        { abre: '18:00', fecha: '23:00', name: 'Jantar' },
        { abre: '19:00', fecha: '23:00', name: 'Fundue da Glória' },
      ],
    },
  ],
  4: [
    // Quinta
    {
      abre: '12:00',
      fecha: '23:00',
      extras: [
        { abre: '12:00', fecha: '16:00', name: 'Menu executivo' },
        { abre: '19:00', fecha: '23:00', name: 'Fundue da Glória' },
      ],
    },
  ],
  5: [
    // Sexta
    {
      abre: '12:00',
      fecha: '23:00',
      extras: [
        { abre: '12:00', fecha: '16:00', name: 'Menu executivo' },
        { abre: '19:00', fecha: '23:00', name: 'Fundue da Glória' },
        { abre: '19:00', fecha: '23:00', name: 'Música ao vivo' },
      ],
    },
  ],
  6: [
    // Sábado
    {
      abre: '10:00',
      fecha: '13:00',
      extras: [{ abre: '10:00', fecha: '13:00', name: 'Café da manhã' }],
    },
    {
      abre: '13:00',
      fecha: '23:00',
      extras: [{ abre: '13:00', fecha: '23:00', name: 'Almoço e jantar' }],
    },
  ],
};

enum toolTypes {
  FUNCTION = 'function',
}

const tools = [
  {
    type: toolTypes.FUNCTION,
    name: 'get_open_status',
    description:
      'Retorna status de funcionamento do restaurante (aberto, horários e eventos extras).',
    parameters: {
      type: 'object',
      properties: {
        isoDatetime: { type: 'string' },
      },
      required: ['isoDatetime'],
    },
    strict: false,
  },
];

@Injectable()
export class AtendenteService {
  private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  constructor() {}

  async perguntarProAtendente(prompt: string): Promise<string> {
    const input: ResponseInput = [{ role: 'user', content: prompt }];

    let resp = await this.openai.responses.create({
      model: 'gpt-5',
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
      model: 'gpt-5',
      input,
      tools,
      tool_choice: 'auto',
    });

    return resp.output_text ?? '';
  }
  private callFunction(name, args) {
    if (name === 'get_open_status') {
      return this.verificaSeEstaAberto(args);
    }
  }

  private verificaSeEstaAberto(isoDatetime: string) {
    const data = new Date(isoDatetime);
    const diaSemana = data.getDay();
    const slotsHoje: Slot[] = HORARIOS[diaSemana] || [];
    const minutosAgora = data.getHours() * 60 + data.getMinutes();

    let abertoAgora = false;
    let proximoFechamento: string | null = null;
    let proximaAbertura: string | null = null;

    function hhmmParaMinutos(hhmm: string) {
      const [h, m] = hhmm.split(':').map(Number);
      return h * 60 + m;
    }

    for (const slot of slotsHoje) {
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
      const slotsAmanha = HORARIOS[amanha] || [];
      if (slotsAmanha.length)
        proximaAbertura = `amanhã às ${slotsAmanha[0].abre}`;
    }

    return {
      isoConsultado: isoDatetime,
      diaSemana,
      abertoAgora,
      horariosDeHoje: slotsHoje,
      proximaAbertura,
      proximoFechamento,
    };
  }
}
