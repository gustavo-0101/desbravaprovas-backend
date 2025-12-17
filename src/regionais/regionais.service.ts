import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/services/audit-log.service';
import { PapelGlobal } from '@prisma/client';

@Injectable()
export class RegionaisService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  async vincularClube(regionalId: number, clubeId: number, executorId?: number) {
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

    try {
      const vinculo = await this.prisma.regionalClube.create({
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

      this.auditLog.log({
        timestamp: new Date(),
        userId: executorId || regionalId,
        action: 'VINCULAR_CLUBE_REGIONAL',
        entity: 'RegionalClube',
        entityId: vinculo.id,
        details: {
          regionalId,
          regionalNome: regional.nome,
          clubeId,
          clubeNome: clube.nome,
        },
      });

      return vinculo;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'Este regional já supervisiona este clube',
        );
      }
      throw error;
    }
  }

  async desvincularClube(regionalId: number, clubeId: number, executorId?: number) {
    const vinculo = await this.prisma.regionalClube.findUnique({
      where: {
        regionalId_clubeId: {
          regionalId,
          clubeId,
        },
      },
      include: {
        regional: {
          select: {
            nome: true,
          },
        },
        clube: {
          select: {
            nome: true,
          },
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

    this.auditLog.log({
      timestamp: new Date(),
      userId: executorId || regionalId,
      action: 'DESVINCULAR_CLUBE_REGIONAL',
      entity: 'RegionalClube',
      entityId: vinculo.id,
      details: {
        regionalId,
        regionalNome: vinculo.regional.nome,
        clubeId,
        clubeNome: vinculo.clube.nome,
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
