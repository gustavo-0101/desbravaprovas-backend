import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength, MaxLength, IsInt, IsPositive } from 'class-validator';

export class CreateUnidadeDto {
  @ApiProperty({
    description: 'Nome da unidade',
    example: 'Águias',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  nome: string;

  @ApiProperty({
    description: 'ID do clube ao qual a unidade pertence',
    example: 1,
  })
  @IsInt()
  @IsPositive()
  clubeId: number;
}
