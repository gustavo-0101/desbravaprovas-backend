import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsPositive,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';

export class UpdateMembroDto {
  @ApiProperty({
    description: 'ID da nova unidade',
    example: 2,
    required: false,
  })
  @IsInt()
  @IsPositive()
  @IsOptional()
  unidadeId?: number;

  @ApiProperty({
    description: 'Novo cargo específico',
    example: 'Tesoureiro',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(50)
  cargoEspecifico?: string;
}
