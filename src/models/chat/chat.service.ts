import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { ResponseInput, Tool } from 'openai/resources/responses/responses';
import { ScheduleTool } from './tools/schedule.tool';

@Injectable()
export class ChatService {
  private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  constructor(private readonly scheduleTool: ScheduleTool) {}

  private tools: Tool[] = [
    {
      type: 'function',
      name: 'classificar_intencao',
      description: 'Extrai data_ou_periodo, informacao e se é visão geral.',
      strict: false,
      parameters: {
        type: 'object',
        properties: {
          data_ou_periodo: {
            type: 'string',
            description:
              'Indica o período específico mencionado (ex: hoje, amanhã, sábado, fim de semana)',
          },
          periodo_generico: {
            type: 'boolean',
            description:
              'Indica o período genérico mencionado, palavras como "quando, como, horário".',
          },
          informacao: {
            type: 'string',
            description:
              'O tema ou conteúdo principal da pergunta (ex: fondue, cardápio, reservas, estacionamento)',
          },
          visao_geral: {
            type: 'boolean',
            description:
              'Indica se a pergunta é sobre a visão geral do bistrô, geralmente associado a perguntas abertas sem período e sem informação especifica. Exemplo: Qual o horário de funcionamento?',
          },
          informacao_generica: {
            type: 'boolean',
            description:
              'True se a informação pedida for genérica (ex: programação, eventos, atrações) e não um evento específico.',
          },
          periodo_referencial: {
            type: 'boolean',
            description:
              'Indica se o período é referencial (ex: hoje, amanhã, semana que vem, etc.)',
          },
        },
        required: [
          'data_ou_periodo',
          'periodo_generico',
          'informacao',
          'visao_geral',
          'informacao_generica',
          'periodo_referencial',
        ],
      },
    },
  ];

  async conversar(prompt: string): Promise<string> {
    const input: ResponseInput = [
      {
        role: 'system',
        content: 'Você é uma atendente simpática do Bistrô da Casa.',
      },
      { role: 'user', content: prompt },
    ];

    const response = await this.openai.responses.create({
      model: 'gpt-4o-mini',
      input,
      tools: this.tools,
      tool_choice: { type: 'function', name: 'classificar_intencao' },
    });

    const toolCall = response.output?.find((o) => o.type === 'function_call');
    if (!toolCall) {
      return 'Desculpe, não entendi sua pergunta 🙏';
    }

    const args = JSON.parse(toolCall.arguments || '{}');

    const textoBase = this.scheduleTool.execute(args, new Date());

    const polido = await this.openai.responses.create({
      model: 'gpt-4o-mini',
      input: [
        {
          role: 'system',
          content:
            'Reescreva em PT-BR natural, como uma atendente simpática do Restaurante Bistrô da Casa. Caso a informação venha repetida, compile-as, e conecte os fatos com coesão. Se os dias da semana forem uma sequencia, use de segunda a sexta por exemplo.',
        },
        { role: 'user', content: textoBase },
      ],
    });

    console.log(polido);

    const final = polido.output.find((o) => o.type === 'message');
    return final?.content.join('') || textoBase;
  }
}
