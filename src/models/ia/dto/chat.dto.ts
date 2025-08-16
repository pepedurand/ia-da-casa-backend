import { IsString, IsOptional, IsArray, IsEnum } from 'class-validator';

export enum OpenAIModel {
  GPT_4O = 'gpt-4o',
  GPT_4O_MINI = 'gpt-4o-mini',
  GPT_4_TURBO = 'gpt-4-turbo',
  GPT_4 = 'gpt-4',
}

export class ChatBody {
  @IsString()
  prompt: string;

  @IsOptional()
  @IsString()
  agentId?: string;

  @IsOptional()
  @IsString()
  threadId?: string;

  @IsOptional()
  @IsString()
  contextId?: string;

  @IsOptional()
  @IsEnum(OpenAIModel)
  model?: OpenAIModel = OpenAIModel.GPT_4O;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}

export class ChatResponse {
  reply: string;

  runId: string;

  threadId: string;
}
