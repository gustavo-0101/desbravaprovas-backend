import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
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
import { UnidadesService } from './unidades.service';
import { CreateUnidadeDto } from './dto/create-unidade.dto';
import { UpdateUnidadeDto } from './dto/update-unidade.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';

@ApiTags('unidades')
@Controller('unidades')
export class UnidadesController {
  constructor(private readonly unidadesService: UnidadesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar nova unidade' })
  @ApiResponse({ status: 201, description: 'Unidade criada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 403, description: 'Sem permissão para criar unidade neste clube' })
  @ApiResponse({ status: 404, description: 'Clube não encontrado' })
  create(
    @Body() createUnidadeDto: CreateUnidadeDto,
    @GetUser('sub') usuarioId: number,
  ) {
    return this.unidadesService.create(createUnidadeDto, usuarioId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas as unidades (opcionalmente filtrar por clube)' })
  @ApiQuery({ name: 'clubeId', required: false, type: Number, description: 'Filtrar por ID do clube' })
  @ApiResponse({ status: 200, description: 'Lista de unidades retornada com sucesso' })
  findAll(@Query('clubeId') clubeId?: string) {
    const clubeIdNum = clubeId ? parseInt(clubeId, 10) : undefined;
    return this.unidadesService.findAll(clubeIdNum);
  }

  @Get('clube/:clubeId')
  @ApiOperation({ summary: 'Listar unidades de um clube específico' })
  @ApiParam({ name: 'clubeId', description: 'ID do clube', type: Number })
  @ApiResponse({ status: 200, description: 'Lista de unidades do clube' })
  @ApiResponse({ status: 404, description: 'Clube não encontrado' })
  findByClube(@Param('clubeId', ParseIntPipe) clubeId: number) {
    return this.unidadesService.findByClube(clubeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar unidade por ID' })
  @ApiParam({ name: 'id', description: 'ID da unidade', type: Number })
  @ApiResponse({ status: 200, description: 'Unidade encontrada' })
  @ApiResponse({ status: 404, description: 'Unidade não encontrada' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.unidadesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar dados da unidade' })
  @ApiParam({ name: 'id', description: 'ID da unidade', type: Number })
  @ApiResponse({ status: 200, description: 'Unidade atualizada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou tentativa de mover unidade' })
  @ApiResponse({ status: 403, description: 'Sem permissão para editar esta unidade' })
  @ApiResponse({ status: 404, description: 'Unidade não encontrada' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUnidadeDto: UpdateUnidadeDto,
    @GetUser('sub') usuarioId: number,
  ) {
    return this.unidadesService.update(id, updateUnidadeDto, usuarioId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deletar unidade' })
  @ApiParam({ name: 'id', description: 'ID da unidade', type: Number })
  @ApiResponse({ status: 200, description: 'Unidade deletada com sucesso' })
  @ApiResponse({ status: 400, description: 'Unidade possui membros vinculados' })
  @ApiResponse({ status: 403, description: 'Sem permissão para deletar esta unidade' })
  @ApiResponse({ status: 404, description: 'Unidade não encontrada' })
  remove(@Param('id', ParseIntPipe) id: number, @GetUser('sub') usuarioId: number) {
    return this.unidadesService.remove(id, usuarioId);
  }
}
