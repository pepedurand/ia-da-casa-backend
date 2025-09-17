import { Controller, Post, Body } from '@nestjs/common';
import { ChatService } from './chat.service';
import { Public } from 'src/auth/isPublic';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Public()
  @Post()
  async conversar(@Body('prompt') prompt: string) {
    return { resposta: await this.chatService.conversar(prompt) };
  }
}
