import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';

export enum AssistantModel {
  GPT_4O = 'gpt-4o',
  GPT_4O_MINI = 'gpt-4o-mini',
  GPT_4_TURBO = 'gpt-4-turbo',
  GPT_4 = 'gpt-4',
}

export class CreateAgentDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  instructions: string;

  @IsOptional()
  @IsEnum(AssistantModel)
  model?: AssistantModel = AssistantModel.GPT_4O;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tools?: string[];

  @IsOptional()
  temperature?: number;

  @IsOptional()
  top_p?: number;
}

export class CreateAgentResponseDto {
  id: string;

  name: string;

  description: string;

  instructions: string;

  model: string;

  created_at: Date;
}
