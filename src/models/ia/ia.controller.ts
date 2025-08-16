import { Controller, Get, Post, Body, Request } from '@nestjs/common';
import { IaService } from './ia.service';
import { ChatBody, ChatResponse } from './dto/chat.dto';

@Controller('ia')
export class IaController {
  constructor(private readonly iaService: IaService) {}

  @Post('chat')
  async chatWithAgent(
    @Request() req,
    @Body() body: ChatBody,
  ): Promise<ChatResponse> {
    try {
      return this.iaService.chat(body);
    } catch (e) {
      console.log(e);
      throw new Error(`Erro ao iniciar chat: ${e.message}`);
    }
  }
}
