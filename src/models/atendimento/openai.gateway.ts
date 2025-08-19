// src/modules/atendimento/openai.gateway.ts
import { Injectable, Inject, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { ITextResponse } from './dto/common.types';
import { DATA_PROVIDER } from './tokens';
import { AtendimentoService, IDataProvider } from './atendimento.service';

@Injectable()
export class OpenAIGateway {
  private readonly logger = new Logger(OpenAIGateway.name);
  private client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  private model = process.env.OPENAI_MODEL || 'gpt-5';

  constructor(
    private readonly atendimento: AtendimentoService,
    @Inject(DATA_PROVIDER) private readonly data: IDataProvider,
  ) {}

  /**
   * Faz uma conversa única com o modelo, expondo tools e
   * executando chamadas de função até a resposta final.
   */
  async chat(params: {
    tenantId: string;
    userText: string;
  }): Promise<ITextResponse> {
    const tools = this.buildTools();

    // 1) Chama o modelo com as tools expostas
    let resp = await this.client.responses.create({
      model: this.model,
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'text' as any,
              text:
                'Você é um atendente humano e simpático. ' +
                'Responda curto, claro e propositivo. ' +
                'Sempre cheque exceções do dia antes do horário padrão. ' +
                'Para +8 pessoas, use handoff. Se não souber, peça detalhes.',
            },
          ],
        },
        {
          role: 'user' as any,
          content: [{ type: 'text' as any, text: params.userText }],
        },
      ],
      tools, // <- define tools para function calling
    });

    // 2) Loop: se o modelo pedir para chamar tools, execute e devolva outputs
    //    (Alguns modelos devolvem em "output[0].content" com steps)
    //    Responses API: cada "tool_call" vem com id + arguments.  :contentReference[oaicite:1]{index=1}
    let guard = 0;
    while (guard++ < 8) {
      const toolCalls = this.extractToolCalls(resp);
      if (!toolCalls.length) break;

      const tool_outputs: Array<{ tool_call_id: string; output: string }> = [];
      for (const call of toolCalls) {
        const output = await this.executeTool(
          call.name,
          call.arguments,
          params.tenantId,
        );
        tool_outputs.push({
          tool_call_id: call.id,
          output: JSON.stringify(output ?? {}),
        });
      }

      // Submete os resultados das tools ao modelo para ele continuar a resposta
      resp = await this.client.responses.create({
        model: this.model,
        input: [
          {
            role: 'tool' as any,
            content: [
              {
                type: 'output_text' as any,
                text: JSON.stringify(tool_outputs),
              },
            ],
          },
        ],
        tools,
      });
    }

    // 3) Extrai texto final
    const text = this.extractText(resp) || 'Consegui te ajudar?';
    return { text };
  }

  /* ---------------- Helpers p/ Responses API ---------------- */

  private extractText(r: OpenAI.Responses.Response): string | undefined {
    const blocks = (r.output ?? []) as any[];
    // procura o primeiro "message" com text
    for (const b of blocks) {
      if (b.type === 'message' && Array.isArray(b.content)) {
        const piece = b.content.find(
          (c: any) => c.type === 'output_text' || c.type === 'text',
        );
        if (piece?.text) return piece.text;
      }
      if (b.type === 'output_text' && b.text) return b.text;
    }
    return undefined;
  }

  private extractToolCalls(
    r: OpenAI.Responses.Response,
  ): Array<{ id: string; name: string; arguments: any }> {
    const out: any[] = (r.output ?? []) as any[];
    const calls: Array<{ id: string; name: string; arguments: any }> = [];

    for (const block of out) {
      if (block.type === 'tool_call') {
        const name = block.name;
        const id = block.id;
        let args: any = {};
        try {
          args = block.arguments ? JSON.parse(block.arguments) : {};
        } catch {}
        calls.push({ id, name, arguments: args });
      }
      // Alguns modelos aninham dentro de "message" -> "content"
      if (block.type === 'message' && Array.isArray(block.content)) {
        for (const c of block.content) {
          if (c.type === 'tool_call') {
            let args: any = {};
            try {
              args = c.arguments ? JSON.parse(c.arguments) : {};
            } catch {}
            calls.push({ id: c.id, name: c.name, arguments: args });
          }
        }
      }
    }
    return calls;
  }

  private buildTools(): OpenAI.Responses.Tool[] {
    // Tools definidas em JSON Schema (function calling). :contentReference[oaicite:2]{index=2}
    return [
      {
        type: 'function',
        name: 'check_closure',
        description: 'Verifica se há fechamento/exceção no dia.',
        parameters: {
          type: 'object',
          properties: {
            dateISO: {
              type: 'string',
              description: 'ISO date/time no fuso -03:00',
            },
            tenantId: { type: 'string' },
          },
          required: ['tenantId'],
        },
        strict: false,
      },
      {
        type: 'function',
        name: 'get_hours',
        description:
          'Obtém horário do dia, incluindo janela de café se aplicável.',
        parameters: {
          type: 'object',
          properties: {
            dateISO: { type: 'string' },
            tenantId: { type: 'string' },
          },
          required: ['tenantId'],
        },
        strict: false,
      },
      {
        type: 'function',
        name: 'list_events',
        description:
          'Lista eventos (cafe, sazonal, musica, standup) no intervalo.',
        parameters: {
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
            from: { type: 'string' },
            to: { type: 'string' },
            kind: {
              type: 'string',
              enum: ['sazonal', 'musica', 'standup', 'cafe', 'executivo'],
            },
          },
          required: ['tenantId'],
        },
        strict: false,
      },
      {
        type: 'function',
        name: 'get_policy',
        description:
          'Retorna texto curto de políticas (rolha, taxa_bolo, pet, pagamento, reserva_encerrada).',
        parameters: {
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
            topic: { type: 'string' },
          },
          required: ['tenantId', 'topic'],
        },
        strict: false,
      },
      {
        type: 'function',
        name: 'create_reservation',
        description: 'Cria reserva (até N pessoas) e retorna protocolo.',
        parameters: {
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
            nome: { type: 'string' },
            pessoas: { type: 'number' },
            dataISO: { type: 'string' },
            telefone: { type: 'string' },
            obs: { type: 'string' },
          },
          required: ['tenantId', 'nome', 'pessoas', 'dataISO'],
        },
        strict: false,
      },
      {
        type: 'function',
        name: 'handoff',
        description: 'Transfere para humano com contexto.',
        parameters: {
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
            motivo: { type: 'string' },
            contexto: { type: 'string' },
          },
          required: ['tenantId', 'motivo', 'contexto'],
        },
        strict: false,
      },
    ];
  }

  private async executeTool(
    name: string,
    args: any,
    tenantId: string,
  ): Promise<any> {
    switch (name) {
      case 'check_closure':
        return this.data.checkClosure({ tenantId, dateISO: args.dateISO });
      case 'get_hours':
        return this.data.getHours({ tenantId, dateISO: args.dateISO });
      case 'list_events':
        return this.data.listEvents({
          tenantId,
          from: args.from,
          to: args.to,
          kind: args.kind,
        });
      case 'get_policy':
        return this.data.getPolicy({ tenantId, topic: args.topic });
      case 'create_reservation':
        return this.data.createReservation({
          tenantId,
          nome: args.nome,
          pessoas: args.pessoas,
          dataISO: args.dataISO,
          telefone: args.telefone,
          obs: args.obs,
        });
      case 'handoff':
        return this.data.handoff({
          tenantId,
          motivo: args.motivo,
          contexto: args.contexto,
        });
      default:
        this.logger.warn(`Tool desconhecida: ${name}`);
        return { ok: false, error: `Tool desconhecida: ${name}` };
    }
  }
}
