import { Controller, Post, Body } from '@nestjs/common';
import { AtendenteService } from './atendente.service';

@Controller('atendente')
export class AtendenteController {
  constructor(private readonly atendenteService: AtendenteService) {}

  @Post('perguntar')
  async perguntar(@Body('prompt') prompt: string) {
    return this.atendenteService.perguntarProAtendente(prompt);
  }
}
