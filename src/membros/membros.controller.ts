import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { MembrosService } from './membros.service';
import { SolicitarVinculoDto } from './dto/solicitar-vinculo.dto';
import { AprovarMembroDto } from './dto/aprovar-membro.dto';
import { UpdateMembroDto } from './dto/update-membro.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';

@ApiTags('membros')
@Controller('membros')
export class MembrosController {
  constructor(private readonly membrosService: MembrosService) {}

  @Post('solicitar-vinculo')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 solicitações por minuto
  @ApiOperation({
    summary: 'Solicitar vínculo a um clube (Rate limit: 3/min)',
    description:
      'Permite que um usuário autenticado solicite vínculo a um clube. ' +
      'O sistema pode ajustar automaticamente o papel para INSTRUTOR se o usuário ' +
      'não for batizado e tiver 18+ anos.',
  })
  @ApiResponse({
    status: 201,
    description: 'Solicitação criada com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou regras de negócio violadas',
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit excedido',
  })
  @ApiResponse({
    status: 404,
    description: 'Clube ou unidade não encontrados',
  })
  @ApiResponse({
    status: 409,
    description: 'Usuário já possui vínculo com este clube',
  })
  solicitarVinculo(
    @Body() solicitarVinculoDto: SolicitarVinculoDto,
    @GetUser('sub') usuarioId: number,
  ) {
    return this.membrosService.solicitarVinculo(solicitarVinculoDto, usuarioId);
  }

  @Post(':id/aprovar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 aprovações por minuto
  @ApiOperation({
    summary: 'Aprovar membro pendente (Rate limit: 20/min)',
    description:
      'Permite que ADMIN_CLUBE ou MASTER aprovem uma solicitação de vínculo. ' +
      'O aprovador pode ajustar o papel e unidade durante a aprovação.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do membro a ser aprovado',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Membro aprovado com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Membro já foi processado ou dados inválidos',
  })
  @ApiResponse({
    status: 403,
    description: 'Apenas ADMIN_CLUBE ou MASTER podem aprovar membros',
  })
  @ApiResponse({
    status: 404,
    description: 'Membro, unidade ou aprovador não encontrado',
  })
  aprovarMembro(
    @Param('id', ParseIntPipe) membroId: number,
    @Body() aprovarMembroDto: AprovarMembroDto,
    @GetUser('sub') aprovadorId: number,
  ) {
    return this.membrosService.aprovarMembro(
      membroId,
      aprovarMembroDto,
      aprovadorId,
    );
  }

  @Delete(':id/rejeitar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 rejeições por minuto
  @ApiOperation({
    summary: 'Rejeitar solicitação de membro (Rate limit: 20/min)',
    description:
      'Permite que ADMIN_CLUBE ou MASTER rejeitem uma solicitação pendente. ' +
      'A solicitação será completamente removida do sistema.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do membro a ser rejeitado',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitação rejeitada com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Apenas solicitações pendentes podem ser rejeitadas',
  })
  @ApiResponse({
    status: 403,
    description: 'Apenas ADMIN_CLUBE ou MASTER podem rejeitar membros',
  })
  @ApiResponse({
    status: 404,
    description: 'Membro não encontrado',
  })
  rejeitarMembro(
    @Param('id', ParseIntPipe) membroId: number,
    @GetUser('sub') aprovadorId: number,
  ) {
    return this.membrosService.rejeitarMembro(membroId, aprovadorId);
  }

  @Get('solicitacoes/:clubeId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Listar solicitações pendentes de um clube',
    description:
      'Lista todas as solicitações de vínculo pendentes de um clube específico. ' +
      'Apenas ADMIN_CLUBE do clube ou MASTER podem visualizar.',
  })
  @ApiParam({
    name: 'clubeId',
    description: 'ID do clube',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de solicitações pendentes',
  })
  @ApiResponse({
    status: 403,
    description: 'Apenas ADMIN_CLUBE ou MASTER podem visualizar solicitações',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuário não encontrado',
  })
  listarSolicitacoes(
    @Param('clubeId', ParseIntPipe) clubeId: number,
    @GetUser('sub') aprovadorId: number,
  ) {
    return this.membrosService.listarSolicitacoes(clubeId, aprovadorId);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar todos os membros',
    description:
      'Lista todos os membros do sistema. Pode ser filtrado por clube usando o query parameter clubeId.',
  })
  @ApiQuery({
    name: 'clubeId',
    description: 'Filtrar membros por ID do clube',
    required: false,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de membros',
  })
  findAll(@Query('clubeId') clubeId?: string) {
    const clubeIdNumber = clubeId ? parseInt(clubeId, 10) : undefined;
    return this.membrosService.findAll(clubeIdNumber);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Buscar membro por ID',
    description: 'Retorna os dados completos de um membro específico.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do membro',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Dados do membro',
  })
  @ApiResponse({
    status: 404,
    description: 'Membro não encontrado',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.membrosService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Atualizar dados de um membro',
    description:
      'Permite que ADMIN_CLUBE ou MASTER atualizem dados de um membro. ' +
      'Pode alterar unidade ou cargo específico.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do membro',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Membro atualizado com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou unidade não pertence ao clube',
  })
  @ApiResponse({
    status: 403,
    description: 'Apenas ADMIN_CLUBE ou MASTER podem editar membros',
  })
  @ApiResponse({
    status: 404,
    description: 'Membro, usuário ou unidade não encontrados',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMembroDto: UpdateMembroDto,
    @GetUser('sub') usuarioId: number,
  ) {
    return this.membrosService.update(id, updateMembroDto, usuarioId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Remover membro',
    description:
      'Remove um membro do clube. Pode ser feito por MASTER, ADMIN_CLUBE ou pelo próprio membro.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do membro',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Membro removido com sucesso',
  })
  @ApiResponse({
    status: 403,
    description: 'Você não tem permissão para remover este membro',
  })
  @ApiResponse({
    status: 404,
    description: 'Membro ou usuário não encontrado',
  })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('sub') usuarioId: number,
  ) {
    return this.membrosService.remove(id, usuarioId);
  }
}
