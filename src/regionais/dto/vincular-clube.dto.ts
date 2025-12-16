import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class VincularClubeDto {
  @ApiProperty({
    description: 'ID do clube a ser supervisionado pelo regional',
    example: 1,
  })
  @IsInt({ message: 'clubeId deve ser um número inteiro' })
  clubeId: number;
}
