import {
  IsEmail,
  IsNotEmpty,
  Matches,
  IsOptional,
  IsDateString,
  Length,
} from 'class-validator';

export class CreateUsuarioDto {
  @IsNotEmpty({
    message: 'Email é obrigatório',
  })
  @IsEmail(
    {},
    {
      message: 'Envie um email válido',
    },
  )
  email: string;

  @IsNotEmpty({
    message: 'Nome é obrigatório',
  })
  @Length(1, 254)
  nome: string;

  @IsNotEmpty({
    message: 'Sobrenome é obrigatório',
  })
  @Length(1, 254)
  sobrenome: string;

  @IsNotEmpty({
    message: 'Senha é obrigatório',
  })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message:
        'A senha deve ter pelo menos 8 caracteres, 1 símbolo, 1 número, 1 letra maiúscula e 1 minúscula.',
    },
  )
  senha: string;

  @IsOptional()
  @Length(0, 254)
  refreshToken?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Data de nascimento deve ser uma data válida' })
  dataNascimento?: Date;

  @IsOptional()
  @Length(0, 254)
  rg?: string;

  @IsOptional()
  @Length(0, 2)
  tipoPessoa?: string;

  @IsOptional()
  @Length(0, 254)
  cpf?: string;

  @IsOptional()
  @Length(0, 254)
  cnpj?: string;

  @IsOptional()
  @Length(0, 254)
  celular?: string;
}
