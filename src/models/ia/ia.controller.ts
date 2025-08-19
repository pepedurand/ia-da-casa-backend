import {
  Controller,
  Get,
  Post,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { IaService } from './ia.service';
import { ChatBody, ChatResponse } from './dto/chat.dto';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { CreateAgentDto, CreateAgentResponseDto } from './dto/create-agent.dto';

@Controller('ia')
export class IaController {
  constructor(private readonly iaService: IaService) {}

  @UseGuards(JwtAuthGuard)
  @Post('chat')
  async chatWithAgent(@Request() req, @Body() body: ChatBody): Promise<any> {
    try {
      return this.iaService.chat(body, req.user.id);
    } catch (e) {
      console.log(e);
      throw new Error(`Erro ao iniciar chat: ${e.message}`);
    }
  }

  @Post('criar-agente')
  async createAgent(
    @Request() req,
    @Body() agentData: CreateAgentDto,
  ): Promise<CreateAgentResponseDto> {
    try {
      const userId = req.user.id;
      return this.iaService.createAgent(userId, agentData);
    } catch (e) {
      console.log(e);
      throw new Error(`Erro ao iniciar chat: ${e.message}`);
    }
  }
}
