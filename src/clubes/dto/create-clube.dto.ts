import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
  IsNumber,
  Min,
  Max,
  Matches,
} from 'class-validator';

export class CreateClubeDto {
  @ApiProperty({
    description: 'Nome completo do clube',
    example: 'Águias da Serra',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  nome: string;

  @ApiProperty({
    description:
      'Slug único do clube (URL-friendly). Se não fornecido, será gerado automaticamente',
    example: 'aguias-da-serra',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug deve conter apenas letras minúsculas, números e hífens',
  })
  slug?: string;

  @ApiProperty({
    description: 'Cidade onde o clube está localizado',
    example: 'São Paulo',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  cidade: string;

  @ApiProperty({
    description: 'Estado (UF) onde o clube está localizado',
    example: 'SP',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  estado: string;

  @ApiProperty({
    description: 'País onde o clube está localizado',
    example: 'Brasil',
    default: 'Brasil',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  pais?: string;

  @ApiProperty({
    description: 'Latitude da localização do clube',
    example: -23.5505,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiProperty({
    description: 'Longitude da localização do clube',
    example: -46.6333,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(-180)
  @Max(180)
  longitude?: number;
}
