import { PartialType } from '@nestjs/swagger';
import { CreateClubeDto } from './create-clube.dto';

export class UpdateClubeDto extends PartialType(CreateClubeDto) {}
