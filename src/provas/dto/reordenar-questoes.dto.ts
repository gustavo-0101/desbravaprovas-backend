import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, ArrayMinSize } from 'class-validator';

export class ReordenarQuestoesDto {
  @ApiProperty({
    description: 'Array de IDs das questões na nova ordem',
    example: [3, 1, 2, 5, 4],
    type: [Number],
  })
  @IsArray({ message: 'questoesIds deve ser um array' })
  @ArrayMinSize(1, { message: 'Deve haver pelo menos 1 questão' })
  @IsInt({ each: true, message: 'Todos os IDs devem ser números inteiros' })
  questoesIds: number[];
}
