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

    // MASTER tem acesso total (bypass)
    if (user.papelGlobal === PapelGlobal.MASTER) {
      return true;
    }

    // Extrair clubeId do request (params ou query)
    const clubeId = this.extractClubeId(request);

    if (!clubeId) {
      throw new BadRequestException(
        'clubeId não encontrado nos parâmetros da requisição',
      );
    }

    // Verificar se é membro do clube (bypass para membros)
    const membro = await this.prisma.membroClube.findFirst({
      where: {
        usuarioId: user.id,
        clubeId: Number(clubeId),
      },
    });

    if (membro) {
      return true; // Membros do clube sempre têm acesso
    }

    // Se não é membro, verificar se é REGIONAL e supervisiona o clube
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
        return true; // REGIONAL supervisiona este clube
      }

      throw new ForbiddenException(
        'Você não tem permissão para acessar recursos deste clube. REGIONAL precisa estar vinculado ao clube.',
      );
    }

    // Não é MASTER, não é membro, não é REGIONAL
    throw new ForbiddenException(
      'Você não tem permissão para acessar recursos deste clube',
    );
  }

  /**
   * Extrai clubeId dos parâmetros da requisição (params, query ou body)
   */
  private extractClubeId(request: any): number | null {
    // Tentar pegar de params primeiro
    if (request.params?.clubeId) {
      return Number(request.params.clubeId);
    }

    // Tentar pegar de query
    if (request.query?.clubeId) {
      return Number(request.query.clubeId);
    }

    // Tentar pegar do body
    if (request.body?.clubeId) {
      return Number(request.body.clubeId);
    }

    // Tentar pegar de params.id se o contexto for um clube
    if (request.params?.id && request.route?.path?.includes('clubes')) {
      return Number(request.params.id);
    }

    return null;
  }
}
