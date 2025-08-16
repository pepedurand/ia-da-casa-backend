import { IsString, IsUUID } from 'class-validator';
export class RefreshTokenDto {
  @IsString()
  refresh_token: string;

  @IsUUID()
  userId: string;
}
