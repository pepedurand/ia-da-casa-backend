import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { AuthLoginDto } from './dto/auth.login.dto';
import * as argon from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { UsuarioService } from '../models/usuario/usuario.service';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Usuario } from '../models/usuario/usuario.entity';
import { JwtPayloadInterface } from './types/jwt.payload.interface';
import { JwtTokenInterface } from './types/jwt.token.interface';

@Injectable()
export class AuthService {
  constructor(
    private usuarioService: UsuarioService,
    private jwtService: JwtService,
  ) {}

  async validateUser(params: AuthLoginDto): Promise<Partial<Usuario> | null> {
    const user = await this.usuarioService.findByEmail(params.email);
    if (user && (await argon.verify(user.senha, params.senha))) {
      const { senha, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: Partial<Usuario>): Promise<JwtTokenInterface> {
    const payload: JwtPayloadInterface = {
      id: user.id ?? '',
      email: user.email ?? '',
      nome: user.nome ?? '',
    };
    const refresh_token = this.jwtService.sign(payload, {
      expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRATION_TIME,
      secret: process.env.JWT_REFRESH_TOKEN_SECRET,
    });
    const tokenEncoded = await argon.hash(refresh_token);
    await this.usuarioService.updateRefreshToken(tokenEncoded, user.id!);

    return {
      access_token: this.jwtService.sign(payload),
      refresh_token,
      nome: user.nome ?? '',
      email: user.email ?? '',
      id: user.id ?? '',
    };
  }

  async refresh(body: RefreshTokenDto): Promise<JwtTokenInterface> {
    const user = (await this.usuarioService.show(body.userId)).data;
    if (!user)
      throw new HttpException(
        {
          error: true,
          message: 'Usuário não encontrado',
          data: null,
        },
        HttpStatus.FORBIDDEN,
      );
    if (!user.refreshToken) {
      throw new HttpException(
        {
          error: true,
          message: 'Refresh token não encontrado para o usuário',
          data: null,
        },
        HttpStatus.FORBIDDEN,
      );
    }
    const compare = await argon.verify(user.refreshToken, body.refresh_token);
    if (!compare)
      throw new HttpException(
        {
          error: true,
          message: 'Refresh token inválido',
          data: null,
        },
        HttpStatus.FORBIDDEN,
      );
    await this.jwtService
      .verifyAsync(body.refresh_token, {
        secret: process.env.JWT_REFRESH_TOKEN_SECRET,
      })
      .catch(() => {
        throw new HttpException(
          {
            error: true,
            message: 'Refresh token inválido',
            data: null,
          },
          HttpStatus.FORBIDDEN,
        );
      });
    const payload: JwtPayloadInterface = {
      id: user.id,
      email: user.email,
      nome: user.nome,
    };
    return {
      access_token: this.jwtService.sign(payload),
      nome: user.nome,
      email: user.email,
      id: user.id,
    };
  }
}
