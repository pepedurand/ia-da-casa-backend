import { BadRequestException, Injectable } from '@nestjs/common';
import { Usuario } from './usuario.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUsuarioDto } from './dto/create.usuario.dto';
import * as argon2 from 'argon2';

@Injectable()
export class UsuarioService {
  constructor(
    @InjectRepository(Usuario)
    private usuarioRepository: Repository<Usuario>,
  ) {}

  async show(id: string): Promise<{ data: Usuario | null }> {
    const usuario = await this.usuarioRepository.findOne({ where: { id } });
    return { data: usuario };
  }

  async updateRefreshToken(refreshToken: string, id: string): Promise<Usuario> {
    await this.usuarioRepository.update({ id }, { refreshToken });
    const usuario = await this.usuarioRepository.findOne({ where: { id } });
    if (!usuario) {
      throw new BadRequestException('Usuário não encontrado');
    }
    return usuario;
  }

  public async findByEmail(email: string): Promise<Usuario> {
    const usuario = await this.usuarioRepository.findOne({
      where: {
        email,
      },
    });

    if (!usuario) {
      throw new BadRequestException('Usuário não encontrado');
    }

    return usuario;
  }

  async create(body: CreateUsuarioDto): Promise<Usuario> {
    try {
      const senha = await argon2.hash(body.senha);

      const createdUser = await this.usuarioRepository.save({ ...body, senha });

      return createdUser;
    } catch (e) {
      console.log(e);
      throw new BadRequestException('Erro ao cadastrar usuário');
    }
  }
}
