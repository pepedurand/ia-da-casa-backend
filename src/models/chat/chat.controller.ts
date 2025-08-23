import { Controller, Post, Body } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async conversar(@Body('prompt') prompt: string) {
    return { resposta: await this.chatService.conversar(prompt) };
  }
}
