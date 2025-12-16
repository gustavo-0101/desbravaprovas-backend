import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { RegionaisService } from './regionais.service';
import { VincularClubeDto } from './dto/vincular-clube.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserType } from '../auth/decorators/current-user.decorator';
import { PapelGlobal } from '@prisma/client';

@ApiTags('regionais')
@Controller('regionais')
export class RegionaisController {
  constructor(private readonly regionaisService: RegionaisService) {}

  @Post(':regionalId/clubes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(PapelGlobal.MASTER)
  @ApiBearerAuth('JWT-auth')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Vincular clube a um regional (MASTER apenas)',
    description: 'Permite que um MASTER vincule um clube a um usuário com papel REGIONAL para supervisão',
  })
  @ApiParam({ name: 'regionalId', description: 'ID do usuário REGIONAL', type: Number })
  @ApiResponse({ status: 201, description: 'Clube vinculado com sucesso ao regional' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 403, description: 'Apenas MASTER pode vincular clubes' })
  @ApiResponse({ status: 404, description: 'Usuário ou clube não encontrado' })
  @ApiResponse({ status: 409, description: 'Regional já supervisiona este clube' })
  vincularClube(
    @Param('regionalId', ParseIntPipe) regionalId: number,
    @Body() vincularClubeDto: VincularClubeDto,
  ) {
    return this.regionaisService.vincularClube(regionalId, vincularClubeDto.clubeId);
  }

  @Delete(':regionalId/clubes/:clubeId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(PapelGlobal.MASTER)
  @ApiBearerAuth('JWT-auth')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Desvincular clube de um regional (MASTER apenas)',
    description: 'Remove o vínculo de supervisão entre um REGIONAL e um clube',
  })
  @ApiParam({ name: 'regionalId', description: 'ID do usuário REGIONAL', type: Number })
  @ApiParam({ name: 'clubeId', description: 'ID do clube', type: Number })
  @ApiResponse({ status: 200, description: 'Clube desvinculado com sucesso' })
  @ApiResponse({ status: 403, description: 'Apenas MASTER pode desvincular clubes' })
  @ApiResponse({ status: 404, description: 'Vínculo não encontrado' })
  desvincularClube(
    @Param('regionalId', ParseIntPipe) regionalId: number,
    @Param('clubeId', ParseIntPipe) clubeId: number,
  ) {
    return this.regionaisService.desvincularClube(regionalId, clubeId);
  }

  @Get(':regionalId/clubes')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Listar clubes supervisionados por um regional',
    description: 'Retorna a lista de todos os clubes que um REGIONAL supervisiona',
  })
  @ApiParam({ name: 'regionalId', description: 'ID do usuário REGIONAL', type: Number })
  @ApiResponse({ status: 200, description: 'Lista de clubes supervisionados retornada com sucesso' })
  @ApiResponse({ status: 404, description: 'Usuário REGIONAL não encontrado' })
  listarClubesDoRegional(@Param('regionalId', ParseIntPipe) regionalId: number) {
    return this.regionaisService.listarClubesDoRegional(regionalId);
  }

  @Get('meus-clubes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(PapelGlobal.REGIONAL)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Listar meus clubes supervisionados (REGIONAL autenticado)',
    description: 'Retorna a lista de clubes que o REGIONAL autenticado supervisiona',
  })
  @ApiResponse({ status: 200, description: 'Lista de clubes supervisionados retornada com sucesso' })
  @ApiResponse({ status: 403, description: 'Apenas usuários com papel REGIONAL podem acessar' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  listarMeusClubes(@CurrentUser() user: CurrentUserType) {
    return this.regionaisService.listarClubesDoRegional(user.id);
  }
}
