import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  ValidateIf,
  IsObject,
} from 'class-validator';
import { TipoQuestao } from '@prisma/client';

export class CreateQuestaoDto {
  @ApiProperty({
    description: 'Tipo da questão',
    enum: TipoQuestao,
    example: TipoQuestao.MULTIPLA_ESCOLHA,
  })
  @IsEnum(TipoQuestao, { message: 'Tipo de questão inválido' })
  tipo: TipoQuestao;

  @ApiProperty({
    description: 'Enunciado da questão',
    example: 'Qual é o primeiro passo ao encontrar uma vítima inconsciente?',
  })
  @IsString({ message: 'Enunciado deve ser uma string' })
  @IsNotEmpty({ message: 'Enunciado é obrigatório' })
  enunciado: string;

  @ApiProperty({
    description:
      'Opções de resposta (obrigatório para MULTIPLA_ESCOLHA)',
    example: {
      a: 'Verificar se há respiração',
      b: 'Chamar ajuda imediatamente',
      c: 'Verificar a consciência',
      d: 'Iniciar RCP',
    },
    required: false,
  })
  @ValidateIf((o) => o.tipo === TipoQuestao.MULTIPLA_ESCOLHA)
  @IsObject({ message: 'Opções devem ser um objeto' })
  @IsNotEmpty({ message: 'Opções são obrigatórias para múltipla escolha' })
  opcoes?: {
    a: string;
    b: string;
    c: string;
    d: string;
  };

  @ApiProperty({
    description:
      'Resposta correta (a/b/c/d para múltipla escolha, critérios para dissertativa/prática)',
    example: 'c',
    required: false,
  })
  @IsString({ message: 'Resposta correta deve ser uma string' })
  @IsOptional()
  respostaCorreta?: string;

  @ApiProperty({
    description: 'Pontuação da questão',
    example: 1,
    default: 1,
    required: false,
  })
  @IsInt({ message: 'Pontuação deve ser um número inteiro' })
  @Min(1, { message: 'Pontuação deve ser no mínimo 1' })
  @IsOptional()
  pontuacao?: number;

  @ApiProperty({
    description: 'Ordem da questão na prova',
    example: 1,
  })
  @IsInt({ message: 'Ordem deve ser um número inteiro' })
  @Min(1, { message: 'Ordem deve ser no mínimo 1' })
  ordem: number;
}
