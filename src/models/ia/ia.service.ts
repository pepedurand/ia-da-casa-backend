import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ChatBody, ChatResponse, OpenAIModel } from './dto/chat.dto';
import OpenAI from 'openai';
import { CreateAgentDto, CreateAgentResponseDto } from './dto/create-agent.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { ConversasAgentes } from './conversas-agentes.entity';
import { Repository } from 'typeorm';
import { Agentes } from './agentes.entity';

const POLLING_CONFIG = {
  MAX_ATTEMPTS: 15,
  INITIAL_DELAY: 1000,
  MAX_DELAY: 8000,
  BACKOFF_MULTIPLIER: 1.5,
};

@Injectable()
export class IaService {
  private openai: OpenAI;

  constructor(
    @InjectRepository(ConversasAgentes)
    private conversasRepository: Repository<ConversasAgentes>,
    @InjectRepository(Agentes)
    private agentesRepository: Repository<Agentes>,
  ) {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async chat(chatData: ChatBody, userId: string): Promise<any> {
    const {
      agentId,
      prompt,
      model = OpenAIModel.GPT_4O,
      threadId: thread_id,
      contextId,
    } = chatData;

    console.log(`Iniciando chat com agente ${agentId} para usuário ${userId}`);

    try {
      let threadRecord: ConversasAgentes | null;
      let threadId: string;

      if (thread_id) {
        threadRecord = await this.conversasRepository.findOne({
          where: { userId, threadId: thread_id },
        });

        if (!threadRecord) {
          console.error(
            `Thread ${thread_id} não encontrada ou não pertence ao usuário ${userId}`,
          );
          throw new BadRequestException(
            'Conversa não encontrada ou não pertence ao usuário',
          );
        }

        threadId = threadRecord.threadId;
        threadRecord.lastUpdated = new Date();
        await this.conversasRepository.save(threadRecord);

        console.log(
          `Usando thread existente ${threadId} para usuário ${userId} e agente ${agentId}`,
        );
      } else {
        const newThread: any = await this.openai.request({
          method: 'post',
          path: '/threads',
          headers: { 'OpenAI-Beta': 'assistants=v2' },
        });
        threadId = newThread.id;

        const title = await this.generateTitle(prompt);

        console.log(
          `Criado novo thread ${threadId} para usuário ${userId} e agente ${agentId} com título: ${title}`,
        );

        threadRecord = this.conversasRepository.create({
          userId,
          agent: agentId,
          threadId,
          title,
        });

        await this.conversasRepository.save(threadRecord);
        // Se usar cache, descomente:
        // const conversationsCacheKey = `openai-agents/conversations/${userId}`;
        // await this.cacheManager.del(conversationsCacheKey);
      }

      await this.openai.request({
        method: 'post',
        path: `/threads/${threadId}/messages`,
        body: { role: 'user', content: prompt },
        headers: { 'OpenAI-Beta': 'assistants=v2' },
      });

      const run: any = await this.openai.request({
        method: 'post',
        path: `/threads/${threadId}/runs`,
        body: {
          assistant_id: agentId,
          model,
        },
        headers: { 'OpenAI-Beta': 'assistants=v2' },
      });

      await this.waitForRunCompletion(threadId, run.id);

      const messages: any = await this.openai.request({
        method: 'get',
        path: `/threads/${threadId}/messages`,
        query: { limit: 1, order: 'desc' },
        headers: { 'OpenAI-Beta': 'assistants=v2' },
      });

      const lastMessage = messages.data?.[0];
      let reply = '';
      if (lastMessage && lastMessage.role === 'assistant') {
        for (const content of lastMessage.content ?? []) {
          if (content.type === 'text') {
            reply += content.text?.value ?? '';
          }
        }
      }

      return {
        reply,
        runId: run.id,
        threadId,
      };
    } catch (error: any) {
      console.error(
        `Erro ao processar chat com agente: ${error.message}`,
        error.stack,
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Erro ao processar chat com agente: ${error.message}`,
      );
    }
  }

  async createAgent(
    userId: string,
    agentData: CreateAgentDto,
  ): Promise<CreateAgentResponseDto> {
    try {
      console.log(
        `Criando novo agente: ${agentData.name} para usuário ${userId}`,
      );

      const tools =
        agentData.tools?.map((tool) => {
          if (tool === 'code_interpreter') {
            return { type: 'code_interpreter' as const };
          } else if (tool === 'file_search') {
            return { type: 'file_search' as const };
          }
          return { type: tool as any };
        }) || [];

      const assistant = await this.openai.beta.assistants.create({
        name: agentData.name,
        instructions: agentData.instructions,
        description: agentData.description,
        model: agentData.model ?? OpenAIModel.GPT_4O,
        tools,
        temperature: agentData.temperature,
        top_p: agentData.top_p,
      });

      const agentRecord = this.agentesRepository.create({
        userId,
        agentId: assistant.id,
      });
      await this.agentesRepository.save(agentRecord);

      // const cacheKey = `openai-agents/agents/${userId}`;
      // await this.cacheManager.del(cacheKey);

      console.log(`Agente criado com sucesso: ${assistant.id}`);

      return {
        id: assistant.id,
        name: assistant.name || '',
        description: assistant.description || '',
        instructions: assistant.instructions || '',
        model: assistant.model,
        created_at: new Date(assistant.created_at * 1000),
      };
    } catch (error) {
      console.error(`Erro ao criar agente: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        `Erro ao criar agente: ${error.message}`,
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
      headers: { 'OpenAI-Beta': 'assistants=v2' },
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
        headers: { 'OpenAI-Beta': 'assistants=v2' },
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
      headers: { 'OpenAI-Beta': 'assistants=v2' },
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
