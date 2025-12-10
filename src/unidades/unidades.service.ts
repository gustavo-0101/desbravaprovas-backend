import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CreateUnidadeDto } from './dto/create-unidade.dto';
import { UpdateUnidadeDto } from './dto/update-unidade.dto';
import { PrismaService } from '../prisma/prisma.service';
import { PapelGlobal } from '@prisma/client';

@Injectable()
export class UnidadesService {
  constructor(private prisma: PrismaService) {}

  async create(createUnidadeDto: CreateUnidadeDto, usuarioId: number) {
    const clube = await this.prisma.clube.findUnique({
      where: { id: createUnidadeDto.clubeId },
    });

    if (!clube) {
      throw new NotFoundException(
        `Clube com ID ${createUnidadeDto.clubeId} não encontrado`,
      );
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const ehMaster = usuario.papelGlobal === PapelGlobal.MASTER;
    const ehCriadorDoClube = usuario.clubeCriadoId === createUnidadeDto.clubeId;

    const membroAdmin = await this.prisma.membroClube.findFirst({
      where: {
        usuarioId,
        clubeId: createUnidadeDto.clubeId,
        papel: 'ADMIN_CLUBE',
      },
    });

    if (!ehMaster && !ehCriadorDoClube && !membroAdmin) {
      throw new ForbiddenException(
        'Apenas MASTER, criador do clube ou ADMIN_CLUBE podem criar unidades',
      );
    }

    return this.prisma.unidade.create({
      data: {
        nome: createUnidadeDto.nome,
        clubeId: createUnidadeDto.clubeId,
      },
      include: {
        clube: {
          select: {
            id: true,
            nome: true,
            slug: true,
          },
        },
      },
    });
  }

  async findAll(clubeId?: number) {
    const where = clubeId ? { clubeId } : {};

    return this.prisma.unidade.findMany({
      where,
      include: {
        clube: {
          select: {
            id: true,
            nome: true,
            slug: true,
          },
        },
        _count: {
          select: {
            membros: true,
            provas: true,
          },
        },
      },
      orderBy: { nome: 'asc' },
    });
  }

  async findOne(id: number) {
    const unidade = await this.prisma.unidade.findUnique({
      where: { id },
      include: {
        clube: {
          select: {
            id: true,
            nome: true,
            slug: true,
          },
        },
        _count: {
          select: {
            membros: true,
            provas: true,
          },
        },
      },
    });

    if (!unidade) {
      throw new NotFoundException(`Unidade com ID ${id} não encontrada`);
    }

    return unidade;
  }

  async findByClube(clubeId: number) {
    const clube = await this.prisma.clube.findUnique({
      where: { id: clubeId },
    });

    if (!clube) {
      throw new NotFoundException(`Clube com ID ${clubeId} não encontrado`);
    }

    return this.findAll(clubeId);
  }

  async update(
    id: number,
    updateUnidadeDto: UpdateUnidadeDto,
    usuarioId: number,
  ) {
    const unidade = await this.findOne(id);

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const ehMaster = usuario.papelGlobal === PapelGlobal.MASTER;
    const ehCriadorDoClube = usuario.clubeCriadoId === unidade.clubeId;

    const membroAdmin = await this.prisma.membroClube.findFirst({
      where: {
        usuarioId,
        clubeId: unidade.clubeId,
        papel: 'ADMIN_CLUBE',
      },
    });

    if (!ehMaster && !ehCriadorDoClube && !membroAdmin) {
      throw new ForbiddenException(
        'Você não tem permissão para editar esta unidade',
      );
    }

    if (updateUnidadeDto.clubeId && updateUnidadeDto.clubeId !== unidade.clubeId) {
      throw new BadRequestException(
        'Não é permitido mover uma unidade para outro clube',
      );
    }

    return this.prisma.unidade.update({
      where: { id },
      data: { nome: updateUnidadeDto.nome },
      include: {
        clube: {
          select: {
            id: true,
            nome: true,
            slug: true,
          },
        },
      },
    });
  }

  async remove(id: number, usuarioId: number) {
    const unidade = await this.findOne(id);

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const ehMaster = usuario.papelGlobal === PapelGlobal.MASTER;
    const ehCriadorDoClube = usuario.clubeCriadoId === unidade.clubeId;

    const membroAdmin = await this.prisma.membroClube.findFirst({
      where: {
        usuarioId,
        clubeId: unidade.clubeId,
        papel: 'ADMIN_CLUBE',
      },
    });

    if (!ehMaster && !ehCriadorDoClube && !membroAdmin) {
      throw new ForbiddenException(
        'Você não tem permissão para deletar esta unidade',
      );
    }

    const temMembros = await this.prisma.membroClube.count({
      where: { unidadeId: id },
    });

    if (temMembros > 0) {
      throw new BadRequestException(
        `Não é possível deletar esta unidade pois ela possui ${temMembros} membro(s) vinculado(s)`,
      );
    }

    return this.prisma.unidade.delete({
      where: { id },
    });
  }
}
