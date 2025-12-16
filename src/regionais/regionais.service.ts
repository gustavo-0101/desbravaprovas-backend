import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PapelGlobal } from '@prisma/client';

@Injectable()
export class RegionaisService {
  constructor(private prisma: PrismaService) {}

  async vincularClube(regionalId: number, clubeId: number) {
    const regional = await this.prisma.usuario.findUnique({
      where: { id: regionalId },
    });

    if (!regional) {
      throw new NotFoundException(
        `Usuário com ID ${regionalId} não encontrado`,
      );
    }

    if (regional.papelGlobal !== PapelGlobal.REGIONAL) {
      throw new ForbiddenException(
        'Apenas usuários com papel REGIONAL podem supervisionar clubes',
      );
    }

    const clube = await this.prisma.clube.findUnique({
      where: { id: clubeId },
    });

    if (!clube) {
      throw new NotFoundException(`Clube com ID ${clubeId} não encontrado`);
    }

    const vinculoExistente = await this.prisma.regionalClube.findUnique({
      where: {
        regionalId_clubeId: {
          regionalId,
          clubeId,
        },
      },
    });

    if (vinculoExistente) {
      throw new ConflictException(
        'Este regional já supervisiona este clube',
      );
    }

    return this.prisma.regionalClube.create({
      data: {
        regionalId,
        clubeId,
      },
      include: {
        clube: {
          select: {
            id: true,
            nome: true,
            cidade: true,
            estado: true,
          },
        },
        regional: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
      },
    });
  }

  async desvincularClube(regionalId: number, clubeId: number) {
    const vinculo = await this.prisma.regionalClube.findUnique({
      where: {
        regionalId_clubeId: {
          regionalId,
          clubeId,
        },
      },
    });

    if (!vinculo) {
      throw new NotFoundException(
        'Vínculo entre regional e clube não encontrado',
      );
    }

    await this.prisma.regionalClube.delete({
      where: {
        regionalId_clubeId: {
          regionalId,
          clubeId,
        },
      },
    });

    return { message: 'Clube desvinculado com sucesso' };
  }

  async listarClubesDoRegional(regionalId: number) {
    const regional = await this.prisma.usuario.findUnique({
      where: { id: regionalId },
      include: {
        regionaisClubes: {
          include: {
            clube: {
              select: {
                id: true,
                nome: true,
                slug: true,
                cidade: true,
                estado: true,
                pais: true,
                latitude: true,
                longitude: true,
                criadoEm: true,
              },
            },
          },
          orderBy: {
            clube: {
              nome: 'asc',
            },
          },
        },
      },
    });

    if (!regional) {
      throw new NotFoundException(
        `Usuário com ID ${regionalId} não encontrado`,
      );
    }

    return regional.regionaisClubes.map((rc) => rc.clube);
  }

  async listarRegionaisDoClube(clubeId: number) {
    const clube = await this.prisma.clube.findUnique({
      where: { id: clubeId },
      include: {
        regionais: {
          include: {
            regional: {
              select: {
                id: true,
                nome: true,
                email: true,
                fotoPerfilUrl: true,
              },
            },
          },
        },
      },
    });

    if (!clube) {
      throw new NotFoundException(`Clube com ID ${clubeId} não encontrado`);
    }

    return clube.regionais.map((rc) => rc.regional);
  }

  async verificarPermissaoRegional(
    regionalId: number,
    clubeId: number,
  ): Promise<boolean> {
    const vinculo = await this.prisma.regionalClube.findUnique({
      where: {
        regionalId_clubeId: {
          regionalId,
          clubeId,
        },
      },
    });

    return !!vinculo;
  }
}
