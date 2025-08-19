import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { OpenAIGateway } from './openai.gateway';
import { ITextResponse } from './dto/common.types';

interface ILLMMessageDTO {
  tenantId: string;
  text: string;
}

@Controller('atendimento/llm')
export class LLMController {
  constructor(private readonly llm: OpenAIGateway) {}

  @Post('message')
  @HttpCode(HttpStatus.OK)
  async message(@Body() body: ILLMMessageDTO): Promise<ITextResponse> {
    return this.llm.chat({ tenantId: body.tenantId, userText: body.text });
  }
}
