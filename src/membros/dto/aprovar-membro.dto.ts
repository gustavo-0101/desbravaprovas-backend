import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsPositive,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { PapelClube } from '@prisma/client';

export class AprovarMembroDto {
  @ApiProperty({
    description: 'Papel final aprovado para o membro (pode ser diferente do solicitado)',
    enum: PapelClube,
    example: 'CONSELHEIRO',
  })
  @IsEnum(PapelClube)
  papel: PapelClube;

  @ApiProperty({
    description: 'ID da unidade (obrigatório para CONSELHEIRO, INSTRUTOR e DESBRAVADOR)',
    example: 1,
    required: false,
  })
  @IsInt()
  @IsPositive()
  @IsOptional()
  unidadeId?: number;

  @ApiProperty({
    description: 'Cargo específico do membro',
    example: 'Diretor',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(50)
  cargoEspecifico?: string;
}
