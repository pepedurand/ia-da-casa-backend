import { Body, Controller, Post, BadRequestException } from '@nestjs/common';
import { UsuarioService } from './usuario.service';
import { Usuario } from './usuario.entity';
import { CreateUsuarioDto } from './dto/create.usuario.dto';
import { Public } from '../../auth/isPublic';

@Controller('usuario')
export class UsuarioController {
  constructor(private readonly usuarioService: UsuarioService) {}

  @Public()
  @Post('cadastrar')
  async store(@Body() body: CreateUsuarioDto): Promise<Usuario> {
    try {
      return await this.usuarioService.create(body);
    } catch (e) {
      console.log(e);
      throw new BadRequestException('Erro ao cadastrar usuário');
    }
  }
}
