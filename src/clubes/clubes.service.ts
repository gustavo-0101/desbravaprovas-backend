import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CreateClubeDto } from './dto/create-clube.dto';
import { UpdateClubeDto } from './dto/update-clube.dto';
import { PrismaService } from '../prisma/prisma.service';
import { PapelGlobal } from '@prisma/client';

@Injectable()
export class ClubesService {
  constructor(private prisma: PrismaService) {}

  async create(createClubeDto: CreateClubeDto, usuarioId: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: { clubeCriado: true },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const ehMaster = usuario.papelGlobal === PapelGlobal.MASTER;

    if (!ehMaster) {
      if (usuario.clubeCriado) {
        throw new ForbiddenException(
          'Você já criou um clube. Apenas usuários MASTER podem criar múltiplos clubes',
        );
      }
    }

    let slug = createClubeDto.slug;
    if (!slug) {
      slug = this.gerarSlug(createClubeDto.nome);
    }

    const clubeExistente = await this.prisma.clube.findUnique({
      where: { slug },
    });

    if (clubeExistente) {
      throw new ConflictException(`Já existe um clube com o slug "${slug}"`);
    }

    const clube = await this.prisma.clube.create({
      data: {
        nome: createClubeDto.nome,
        slug,
        cidade: createClubeDto.cidade,
        estado: createClubeDto.estado,
        pais: createClubeDto.pais || 'Brasil',
        latitude: createClubeDto.latitude,
        longitude: createClubeDto.longitude,
      },
    });

    if (!ehMaster) {
      await this.prisma.usuario.update({
        where: { id: usuarioId },
        data: { clubeCriadoId: clube.id },
      });
    }

    return clube;
  }

  async findAll(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [clubes, total] = await Promise.all([
      this.prisma.clube.findMany({
        skip,
        take: limit,
        orderBy: { criadoEm: 'desc' },
        include: {
          _count: {
            select: {
              membros: true,
              unidades: true,
              provas: true,
            },
          },
        },
      }),
      this.prisma.clube.count(),
    ]);

    return {
      data: clubes,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const clube = await this.prisma.clube.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            membros: true,
            unidades: true,
            provas: true,
          },
        },
      },
    });

    if (!clube) {
      throw new NotFoundException(`Clube com ID ${id} não encontrado`);
    }

    return clube;
  }

  async findBySlug(slug: string) {
    const clube = await this.prisma.clube.findUnique({
      where: { slug },
      include: {
        _count: {
          select: {
            membros: true,
            unidades: true,
            provas: true,
          },
        },
      },
    });

    if (!clube) {
      throw new NotFoundException(`Clube com slug "${slug}" não encontrado`);
    }

    return clube;
  }

  async update(id: number, updateClubeDto: UpdateClubeDto, usuarioId: number) {
    await this.findOne(id);

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const ehMaster = usuario.papelGlobal === PapelGlobal.MASTER;
    const ehCriador = usuario.clubeCriadoId === id;

    const membroAdmin = await this.prisma.membroClube.findFirst({
      where: {
        usuarioId,
        clubeId: id,
        papel: 'ADMIN_CLUBE',
      },
    });

    if (!ehMaster && !ehCriador && !membroAdmin) {
      throw new ForbiddenException(
        'Você não tem permissão para editar este clube',
      );
    }

    if (updateClubeDto.slug) {
      const clubeComSlug = await this.prisma.clube.findUnique({
        where: { slug: updateClubeDto.slug },
      });

      if (clubeComSlug && clubeComSlug.id !== id) {
        throw new ConflictException(
          `Já existe um clube com o slug "${updateClubeDto.slug}"`,
        );
      }
    }

    return this.prisma.clube.update({
      where: { id },
      data: updateClubeDto,
    });
  }

  async remove(id: number, usuarioId: number) {
    await this.findOne(id);

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (usuario.papelGlobal !== PapelGlobal.MASTER) {
      throw new ForbiddenException(
        'Apenas usuários MASTER podem deletar clubes',
      );
    }

    return this.prisma.clube.delete({
      where: { id },
    });
  }

  private gerarSlug(nome: string): string {
    return nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }
}
