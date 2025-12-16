import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PapelGlobal } from '@prisma/client';

/**
 * Guard para verificar se um usuário REGIONAL tem permissão para acessar recursos de um clube específico
 *
 * Como usar:
 * 1. Aplique @UseGuards(JwtAuthGuard, RegionalClubeGuard) no endpoint
 * 2. O endpoint deve ter um parâmetro 'clubeId' na rota ou query
 * 3. O guard verifica se o usuário é REGIONAL e se supervisiona o clube
 *
 * Importante:
 * - MASTER sempre tem acesso (bypass)
 * - REGIONAL precisa estar vinculado ao clube via RegionalClube
 * - Membros do clube sempre têm acesso (bypass)
 */
@Injectable()
export class RegionalClubeGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    if (user.papelGlobal === PapelGlobal.MASTER) {
      return true;
    }

    const clubeId = this.extractClubeId(request);

    if (!clubeId) {
      throw new BadRequestException(
        'clubeId não encontrado nos parâmetros da requisição',
      );
    }

    const membro = await this.prisma.membroClube.findFirst({
      where: {
        usuarioId: user.id,
        clubeId: Number(clubeId),
      },
    });

    if (membro) {
      return true;
    }

    if (user.papelGlobal === PapelGlobal.REGIONAL) {
      const vinculo = await this.prisma.regionalClube.findUnique({
        where: {
          regionalId_clubeId: {
            regionalId: user.id,
            clubeId: Number(clubeId),
          },
        },
      });

      if (vinculo) {
        return true;
      }

      throw new ForbiddenException(
        'Você não tem permissão para acessar recursos deste clube. REGIONAL precisa estar vinculado ao clube.',
      );
    }

    throw new ForbiddenException(
      'Você não tem permissão para acessar recursos deste clube',
    );
  }

  /**
   * Extrai clubeId dos parâmetros da requisição (params, query ou body)
   */
  private extractClubeId(request: any): number | null {
    if (request.params?.clubeId) {
      return Number(request.params.clubeId);
    }

    if (request.query?.clubeId) {
      return Number(request.query.clubeId);
    }

    if (request.body?.clubeId) {
      return Number(request.body.clubeId);
    }

    if (request.params?.id && request.route?.path?.includes('clubes')) {
      return Number(request.params.id);
    }

    return null;
  }
}
