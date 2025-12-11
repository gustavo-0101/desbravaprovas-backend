import { PartialType } from '@nestjs/swagger';
import { CreateProvaDto } from './create-prova.dto';

export class UpdateProvaDto extends PartialType(CreateProvaDto) {}
