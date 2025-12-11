import { PartialType } from '@nestjs/swagger';
import { CreateQuestaoDto } from './create-questao.dto';

export class UpdateQuestaoDto extends PartialType(CreateQuestaoDto) {}
