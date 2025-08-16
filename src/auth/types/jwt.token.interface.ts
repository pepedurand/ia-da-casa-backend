export interface JwtTokenInterface {
  access_token: string;
  refresh_token?: string;
  nome: string;
  email: string;
  id: string;
}
