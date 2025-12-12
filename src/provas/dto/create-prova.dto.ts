import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsInt,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  CategoriaEspecialidade,
  VisibilidadeProva,
} from '@prisma/client';

export class CreateProvaDto {
  @ApiProperty({
    description: 'Título da prova',
    example: 'Primeiros Socorros Básicos',
    maxLength: 255,
  })
  @IsString({ message: 'Título deve ser uma string' })
  @IsNotEmpty({ message: 'Título é obrigatório' })
  @MaxLength(255, { message: 'Título não pode exceder 255 caracteres' })
  titulo: string;

  @ApiProperty({
    description: 'Descrição detalhada da prova',
    example: 'Prova completa sobre primeiros socorros básicos',
    required: false,
  })
  @IsString({ message: 'Descrição deve ser uma string' })
  @IsOptional()
  descricao?: string;

  @ApiProperty({
    description: 'Categoria da especialidade',
    enum: CategoriaEspecialidade,
    example: CategoriaEspecialidade.CIENCIA_E_SAUDE,
  })
  @IsEnum(CategoriaEspecialidade, {
    message: 'Categoria inválida',
  })
  categoria: CategoriaEspecialidade;

  @ApiProperty({
    description: 'Visibilidade da prova',
    enum: VisibilidadeProva,
    example: VisibilidadeProva.PRIVADA_CLUBE,
  })
  @IsEnum(VisibilidadeProva, {
    message: 'Visibilidade inválida',
  })
  visibilidade: VisibilidadeProva;

  @ApiProperty({
    description: 'ID da unidade (obrigatório se visibilidade = PRIVADA_UNIDADE)',
    example: 1,
    required: false,
  })
  @IsInt({ message: 'unidadeId deve ser um número inteiro' })
  @IsOptional()
  unidadeId?: number;

  @ApiProperty({
    description:
      'Slug da especialidade no MDA Wiki (ex: Especialidade_de_Primeiros_Socorros_-_básico/)',
    example: 'Especialidade_de_Primeiros_Socorros_-_b%C3%A1sico/',
    required: false,
  })
  @IsString({ message: 'urlReferenciaMDA deve ser uma string' })
  @IsOptional()
  @Matches(/^[^/].*\/$/, {
    message:
      'urlReferenciaMDA deve ser apenas o slug (sem https://mda.wiki.br/)',
  })
  urlReferenciaMDA?: string;

  @ApiProperty({
    description: 'ID do clube (opcional - apenas para usuários MASTER que não são membros de um clube)',
    example: 1,
    required: false,
  })
  @IsInt({ message: 'clubeId deve ser um número inteiro' })
  @IsOptional()
  clubeId?: number;
}
