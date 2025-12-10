import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsPositive,
  IsDateString,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { PapelClube } from '@prisma/client';

export class SolicitarVinculoDto {
  @ApiProperty({
    description: 'ID do clube ao qual deseja se vincular',
    example: 1,
  })
  @IsInt()
  @IsPositive()
  clubeId: number;

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
    description: 'Papel desejado no clube',
    enum: PapelClube,
    example: 'CONSELHEIRO',
  })
  @IsEnum(PapelClube)
  papelDesejado: PapelClube;

  @ApiProperty({
    description: 'Data de nascimento do membro',
    example: '2000-01-15',
  })
  @IsDateString()
  dataNascimento: string;

  @ApiProperty({
    description: 'Se o membro é batizado',
    example: true,
  })
  @IsBoolean()
  batizado: boolean;

  @ApiProperty({
    description: 'Cargo específico (ex: Diretor, Capitão, Secretário, etc.)',
    example: 'Secretário',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(50)
  cargoEspecifico?: string;
}
