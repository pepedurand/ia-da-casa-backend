import { Usuario } from 'src/models/usuario/usuario.entity';

export interface LoginResponseInterface {
  auth: boolean;
  token: string;
  usuario: Usuario;
}
