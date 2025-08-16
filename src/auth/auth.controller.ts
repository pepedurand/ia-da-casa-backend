import {
  Controller,
  Request,
  Post,
  UseGuards,
  HttpCode,
  Body,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './isPublic';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LocalAuthGuard } from 'src/guards/local-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('')
  @HttpCode(200)
  async login(@Request() req) {
    try {
      return await this.authService.login(req.user);
    } catch (e) {
      console.log(e);
      throw new HttpException(
        {
          error: true,
          message: 'Erro ao fazer login',
          data: null,
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  @Public()
  // @Recaptcha()
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Request() req, @Body() body: RefreshTokenDto) {
    return this.authService.refresh(body);
  }
}
