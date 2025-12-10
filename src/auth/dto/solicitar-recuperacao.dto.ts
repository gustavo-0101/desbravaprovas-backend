import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SolicitarRecuperacaoDto {
  @ApiProperty({
    description: 'Email do usuário',
    example: 'usuario@exemplo.com',
  })
  @IsEmail()
  email: string;
}
