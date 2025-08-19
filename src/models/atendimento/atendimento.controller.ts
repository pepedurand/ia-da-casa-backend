// src/modules/atendimento/atendimento.controller.ts
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { AtendimentoService } from './atendimento.service';
import { ITextResponse } from './dto/common.types';
import { IMessageRequestDTO } from './dto/message.dto';
import { ICreateReservationParams } from './dto/reserva.dto';

@Controller('atendimento')
export class AtendimentoController {
  constructor(private readonly atendimento: AtendimentoService) {}

  @Get('health')
  @HttpCode(HttpStatus.OK)
  health(): { ok: boolean } {
    return { ok: true };
  }

  @Post('message')
  @HttpCode(HttpStatus.OK)
  async handleMessage(
    @Body() body: IMessageRequestDTO,
  ): Promise<ITextResponse> {
    try {
      if (!body?.tenantId || !body?.text) {
        throw new HttpException(
          'tenantId e text são obrigatórios',
          HttpStatus.BAD_REQUEST,
        );
      }
      return await this.atendimento.handleUserMessage(body);
    } catch (e: any) {
      throw new HttpException(
        e?.message || 'Erro ao processar mensagem',
        e?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
