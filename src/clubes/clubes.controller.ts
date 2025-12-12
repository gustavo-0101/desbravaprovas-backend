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
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ClubesService } from './clubes.service';
import { CreateClubeDto } from './dto/create-clube.dto';
import { UpdateClubeDto } from './dto/update-clube.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('clubes')
@Controller('clubes')
export class ClubesController {
  constructor(private readonly clubesService: ClubesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 clubes por minuto
  @ApiOperation({ summary: 'Criar novo clube (Rate limit: 5/min)' })
  @ApiResponse({ status: 201, description: 'Clube criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 403, description: 'Usuário já criou um clube ou sem permissão' })
  @ApiResponse({ status: 409, description: 'Slug já em uso' })
  @ApiResponse({ status: 429, description: 'Rate limit excedido' })
  create(@Body() createClubeDto: CreateClubeDto, @GetUser('sub') usuarioId: number) {
    return this.clubesService.create(createClubeDto, usuarioId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os clubes com paginação' })
  @ApiResponse({ status: 200, description: 'Lista de clubes retornada com sucesso' })
  @ApiResponse({ status: 400, description: 'Parâmetros de paginação inválidos' })
  findAll(@Query() paginationDto: PaginationDto) {
    return this.clubesService.findAll(paginationDto.page, paginationDto.limit);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Buscar clube por slug' })
  @ApiParam({ name: 'slug', description: 'Slug único do clube', example: 'aguias-da-serra' })
  @ApiResponse({ status: 200, description: 'Clube encontrado' })
  @ApiResponse({ status: 404, description: 'Clube não encontrado' })
  findBySlug(@Param('slug') slug: string) {
    return this.clubesService.findBySlug(slug);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar clube por ID' })
  @ApiParam({ name: 'id', description: 'ID do clube', type: Number })
  @ApiResponse({ status: 200, description: 'Clube encontrado' })
  @ApiResponse({ status: 404, description: 'Clube não encontrado' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.clubesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 updates por minuto
  @ApiOperation({ summary: 'Atualizar dados do clube (Rate limit: 10/min)' })
  @ApiParam({ name: 'id', description: 'ID do clube', type: Number })
  @ApiResponse({ status: 200, description: 'Clube atualizado com sucesso' })
  @ApiResponse({ status: 403, description: 'Sem permissão para editar este clube' })
  @ApiResponse({ status: 404, description: 'Clube não encontrado' })
  @ApiResponse({ status: 409, description: 'Slug já em uso' })
  @ApiResponse({ status: 429, description: 'Rate limit excedido' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateClubeDto: UpdateClubeDto,
    @GetUser('sub') usuarioId: number,
  ) {
    return this.clubesService.update(id, updateClubeDto, usuarioId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 deletes por minuto
  @ApiOperation({ summary: 'Deletar clube (apenas MASTER) (Rate limit: 3/min)' })
  @ApiParam({ name: 'id', description: 'ID do clube', type: Number })
  @ApiResponse({ status: 200, description: 'Clube deletado com sucesso' })
  @ApiResponse({ status: 403, description: 'Apenas MASTER pode deletar clubes' })
  @ApiResponse({ status: 404, description: 'Clube não encontrado' })
  @ApiResponse({ status: 429, description: 'Rate limit excedido' })
  remove(@Param('id', ParseIntPipe) id: number, @GetUser('sub') usuarioId: number) {
    return this.clubesService.remove(id, usuarioId);
  }
}
