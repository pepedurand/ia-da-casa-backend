import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { AuthService } from './auth.service';
import { UsuarioService } from '../models/usuario/usuario.service';
import { JwtPayloadInterface } from './types/jwt.payload.interface';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh-token',
) {
  constructor(private usersService: UsuarioService) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refresh_token'),
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: JwtPayloadInterface) {
    const { email } = payload;
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new HttpException(
        {
          error: true,
          message: 'Usuário não econtrado para o e-mail ' + email,
          data: null,
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
    return user;
  }
}
