import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AlterarSenhaDto {
  @ApiProperty({ description: 'Senha atual do usuário' })
  @IsString()
  senhaAtual: string;

  @ApiProperty({ description: 'Nova senha (mínimo 6 caracteres)' })
  @IsString()
  @MinLength(6, { message: 'A nova senha deve ter no mínimo 6 caracteres' })
  novaSenha: string;
}
