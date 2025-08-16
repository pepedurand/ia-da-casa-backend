import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ChatBody, ChatResponse, OpenAIModel } from './dto/chat.dto';
import OpenAI from 'openai';

const POLLING_CONFIG = {
  MAX_ATTEMPTS: 15,
  INITIAL_DELAY: 1000,
  MAX_DELAY: 8000,
  BACKOFF_MULTIPLIER: 1.5,
};

@Injectable()
export class IaService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async chat(chatData: ChatBody): Promise<ChatResponse> {
    const {
      agentId,
      prompt,
      model = OpenAIModel.GPT_4O,
      threadId: threadIdFromParams,
      contextId,
    } = chatData;

    if (!agentId) throw new BadRequestException('agentId is required');
    if (!prompt) throw new BadRequestException('prompt is required');

    try {
      let threadId = threadIdFromParams;
      if (!threadId) {
        const newThread: any = await this.openai.request({
          method: 'post',
          path: '/threads',
        });

        threadId = newThread.id;
        if (!threadId) {
          throw new InternalServerErrorException(
            'Failed to create a new thread',
          );
        }

        const title = await this.generateTitle(prompt);
        console.log(`New thread created: ${threadId} - ${title}`);
      }

      await this.openai.request({
        method: 'post',
        path: `/threads/${threadId}/messages`,
        body: { role: 'user', content: prompt },
      });

      const run: any = await this.openai.request({
        method: 'post',
        path: `/threads/${threadId}/runs`,
        body: {
          assistant_id: agentId,
          model, // se omitir, usa o do assistant
          // instructions: "instruções extras opcionais",
        },
      });

      // 4) Espera concluir (ou trata tools)
      await this.waitForRunCompletion(threadId, run.id);

      // 5) Pega a última resposta do assistant
      const reply = await this.fetchLastAssistantMessage(threadId);

      return {
        reply: reply ?? '',
        runId: run.id,
        threadId,
      };
    } catch (error: any) {
      throw new InternalServerErrorException(
        `Erro ao processar chat com agente: ${error?.message}`,
      );
    }
  }

  private async fetchLastAssistantMessage(
    threadId: string,
  ): Promise<string | null> {
    const messages: any = await this.openai.request({
      method: 'get',
      path: `/threads/${threadId}/messages`,
      query: { limit: 30, order: 'desc' },
    });

    const lastMessage = messages.data?.[0];
    if (!lastMessage || lastMessage.role !== 'assistant') return null;

    let text = '';
    for (const content of lastMessage.content ?? []) {
      if (content.type === 'text') text += content.text?.value ?? '';
    }
    return text || null;
  }

  private async waitForRunCompletion(
    threadId: string,
    runId: string,
  ): Promise<void> {
    let delay = POLLING_CONFIG.INITIAL_DELAY;

    for (let attempt = 0; attempt < POLLING_CONFIG.MAX_ATTEMPTS; attempt++) {
      const run: any = await this.openai.request({
        method: 'get',
        path: `/threads/${threadId}/runs/${runId}`,
      });

      const status = run.status as string;

      if (status === 'completed') return;

      if (status === 'requires_action') {
        await this.handleRequiredAction(threadId, runId, run);
      } else if (
        status === 'failed' ||
        status === 'cancelled' ||
        status === 'expired'
      ) {
        throw new InternalServerErrorException(
          `Execução falhou com status: ${status}`,
        );
      }

      await this.sleep(delay);
      delay = Math.min(
        delay * POLLING_CONFIG.BACKOFF_MULTIPLIER,
        POLLING_CONFIG.MAX_DELAY,
      );
    }

    throw new InternalServerErrorException(
      `Timeout aguardando conclusão da execução (máximo ${POLLING_CONFIG.MAX_ATTEMPTS} tentativas)`,
    );
  }

  private async handleRequiredAction(
    threadId: string,
    runId: string,
    run: any,
  ) {
    const calls = run?.required_action?.submit_tool_outputs?.tool_calls ?? [];
    if (!calls.length) return;

    const outputs: { tool_call_id: string; output: string }[] = [];

    for (const call of calls) {
      const toolName = call.function?.name;
      const argsStr = call.function?.arguments ?? '{}';

      let result: any;
      try {
        const args = JSON.parse(argsStr);
        // TODO: integre seu ToolRegistry real aqui:
        // result = await this.toolRegistry.execute(toolName, args);
        result = { ok: true, echo: { toolName, args } }; // mock
      } catch (e: any) {
        result = { ok: false, error: e?.message };
      }

      outputs.push({
        tool_call_id: call.id,
        output: JSON.stringify(result),
      });
    }

    await this.openai.request({
      method: 'post',
      path: `/threads/${threadId}/runs/${runId}/submit_tool_outputs`,
      body: { tool_outputs: outputs },
    });
  }

  private async generateTitle(prompt: string): Promise<string> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: OpenAIModel.GPT_4O,
        messages: [
          {
            role: 'system',
            content:
              'Gere um título conciso e descritivo (máximo 50 caracteres) para a seguinte conversa. Responda apenas com o título, sem aspas ou formatação.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 20,
        temperature: 0.7,
      });

      return (
        completion.choices[0]?.message?.content?.trim() || 'Conversa sem título'
      );
    } catch {
      return 'Conversa sem título';
    }
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
