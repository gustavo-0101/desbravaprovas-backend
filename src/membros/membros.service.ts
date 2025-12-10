import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { SolicitarVinculoDto } from './dto/solicitar-vinculo.dto';
import { AprovarMembroDto } from './dto/aprovar-membro.dto';
import { UpdateMembroDto } from './dto/update-membro.dto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { PapelGlobal, PapelClube, StatusMembro } from '@prisma/client';

@Injectable()
export class MembrosService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async solicitarVinculo(
    dto: SolicitarVinculoDto,
    usuarioId: number,
  ) {
    const clube = await this.prisma.clube.findUnique({
      where: { id: dto.clubeId },
    });

    if (!clube) {
      throw new NotFoundException(`Clube com ID ${dto.clubeId} não encontrado`);
    }

    const vinculoExistente = await this.prisma.membroClube.findUnique({
      where: {
        usuarioId_clubeId: {
          usuarioId,
          clubeId: dto.clubeId,
        },
      },
    });

    if (vinculoExistente) {
      throw new ConflictException('Você já possui um vínculo com este clube');
    }

    const dataNascimento = new Date(dto.dataNascimento);
    const idade = this.calcularIdade(dataNascimento);

    let papelFinal = dto.papelDesejado;
    let unidadeIdFinal = dto.unidadeId;

    if (!dto.batizado && idade >= 18) {
      papelFinal = PapelClube.INSTRUTOR;
    }

    if (
      (papelFinal === PapelClube.CONSELHEIRO ||
        papelFinal === PapelClube.INSTRUTOR ||
        papelFinal === PapelClube.DESBRAVADOR) &&
      !dto.unidadeId
    ) {
      throw new BadRequestException(
        `Papel ${papelFinal} requer que você informe uma unidade`,
      );
    }

    if (papelFinal === PapelClube.CONSELHEIRO && idade < 16) {
      throw new BadRequestException(
        'Você deve ter no mínimo 16 anos para ser CONSELHEIRO',
      );
    }

    if (
      (papelFinal === PapelClube.DIRETORIA ||
        papelFinal === PapelClube.CONSELHEIRO) &&
      !dto.batizado
    ) {
      throw new BadRequestException(
        `Papel ${papelFinal} requer que você seja batizado`,
      );
    }

    if (papelFinal === PapelClube.DIRETORIA && dto.cargoEspecifico) {
      const cargosSemUnidade = ['Diretor', 'Secretário'];
      if (cargosSemUnidade.includes(dto.cargoEspecifico) && dto.unidadeId) {
        unidadeIdFinal = undefined;
      } else if (
        !cargosSemUnidade.includes(dto.cargoEspecifico) &&
        !dto.unidadeId
      ) {
        throw new BadRequestException(
          `Cargo ${dto.cargoEspecifico} da DIRETORIA requer uma unidade`,
        );
      }
    }

    if (dto.unidadeId) {
      const unidade = await this.prisma.unidade.findUnique({
        where: { id: dto.unidadeId },
      });

      if (!unidade) {
        throw new NotFoundException(
          `Unidade com ID ${dto.unidadeId} não encontrada`,
        );
      }

      if (unidade.clubeId !== dto.clubeId) {
        throw new BadRequestException(
          'A unidade informada não pertence a este clube',
        );
      }
    }

    if (papelFinal === PapelClube.ADMIN_CLUBE) {
      throw new BadRequestException(
        'Não é possível solicitar o papel ADMIN_CLUBE. Entre em contato com o administrador do sistema.',
      );
    }

    const membro = await this.prisma.membroClube.create({
      data: {
        usuarioId,
        clubeId: dto.clubeId,
        unidadeId: unidadeIdFinal,
        papel: papelFinal,
        dataNascimento,
        batizado: dto.batizado,
        cargoEspecifico: dto.cargoEspecifico,
        status: StatusMembro.PENDENTE,
      },
      include: {
        clube: {
          select: {
            id: true,
            nome: true,
            slug: true,
          },
        },
        unidade: {
          select: {
            id: true,
            nome: true,
          },
        },
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
      },
    });

    const adminClube = await this.prisma.membroClube.findFirst({
      where: {
        clubeId: dto.clubeId,
        papel: PapelClube.ADMIN_CLUBE,
        status: StatusMembro.ATIVO,
      },
      include: {
        usuario: {
          select: {
            nome: true,
            email: true,
          },
        },
      },
    });

    if (adminClube) {
      try {
        await this.emailService.enviarEmailNovaSolicitacaoMembro(
          adminClube.usuario.email,
          adminClube.usuario.nome,
          membro.usuario.nome,
          membro.usuario.email,
          membro.clube.nome,
          papelFinal,
          membro.unidade?.nome,
        );
      } catch (error) {
        console.error('Erro ao enviar email para ADMIN_CLUBE:', error);
      }
    }

    return {
      ...membro,
      mensagem:
        papelFinal !== dto.papelDesejado
          ? `Sua solicitação foi ajustada para ${papelFinal} pois você não é batizado e tem 18+ anos`
          : undefined,
    };
  }

  async aprovarMembro(
    membroId: number,
    dto: AprovarMembroDto,
    aprovadorId: number,
  ) {
    const membro = await this.prisma.membroClube.findUnique({
      where: { id: membroId },
      include: {
        usuario: true,
        clube: true,
      },
    });

    if (!membro) {
      throw new NotFoundException(`Membro com ID ${membroId} não encontrado`);
    }

    if (membro.status !== StatusMembro.PENDENTE) {
      throw new BadRequestException(
        `Este membro já foi ${membro.status === StatusMembro.ATIVO ? 'aprovado' : 'bloqueado'}`,
      );
    }

    const aprovador = await this.prisma.usuario.findUnique({
      where: { id: aprovadorId },
    });

    if (!aprovador) {
      throw new NotFoundException('Aprovador não encontrado');
    }

    const ehMaster = aprovador.papelGlobal === PapelGlobal.MASTER;
    const membroAdminClube = await this.prisma.membroClube.findFirst({
      where: {
        usuarioId: aprovadorId,
        clubeId: membro.clubeId,
        papel: PapelClube.ADMIN_CLUBE,
        status: StatusMembro.ATIVO,
      },
    });

    if (!ehMaster && !membroAdminClube) {
      throw new ForbiddenException(
        'Apenas MASTER ou ADMIN_CLUBE podem aprovar membros',
      );
    }

    const papelFinal = dto.papel;
    let unidadeIdFinal = dto.unidadeId;

    if (
      (papelFinal === PapelClube.CONSELHEIRO ||
        papelFinal === PapelClube.INSTRUTOR ||
        papelFinal === PapelClube.DESBRAVADOR) &&
      !dto.unidadeId
    ) {
      throw new BadRequestException(
        `Papel ${papelFinal} requer uma unidade`,
      );
    }

    if (papelFinal === PapelClube.DIRETORIA && dto.cargoEspecifico) {
      const cargosSemUnidade = ['Diretor', 'Secretário'];
      if (cargosSemUnidade.includes(dto.cargoEspecifico)) {
        unidadeIdFinal = undefined;
      } else if (!dto.unidadeId) {
        throw new BadRequestException(
          `Cargo ${dto.cargoEspecifico} da DIRETORIA requer uma unidade`,
        );
      }
    }

    if (dto.unidadeId) {
      const unidade = await this.prisma.unidade.findUnique({
        where: { id: dto.unidadeId },
      });

      if (!unidade) {
        throw new NotFoundException(
          `Unidade com ID ${dto.unidadeId} não encontrada`,
        );
      }

      if (unidade.clubeId !== membro.clubeId) {
        throw new BadRequestException(
          'A unidade informada não pertence a este clube',
        );
      }
    }

    const membroAprovado = await this.prisma.membroClube.update({
      where: { id: membroId },
      data: {
        papel: papelFinal,
        unidadeId: unidadeIdFinal,
        cargoEspecifico: dto.cargoEspecifico,
        status: StatusMembro.ATIVO,
      },
      include: {
        clube: {
          select: {
            id: true,
            nome: true,
            slug: true,
          },
        },
        unidade: {
          select: {
            id: true,
            nome: true,
          },
        },
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
      },
    });

    try {
      await this.emailService.enviarEmailSolicitacaoAprovada(
        membroAprovado.usuario.email,
        membroAprovado.usuario.nome,
        membroAprovado.clube.nome,
        papelFinal,
        membroAprovado.unidade?.nome,
      );
    } catch (error) {
      console.error('Erro ao enviar email de aprovação:', error);
    }

    return membroAprovado;
  }

  async rejeitarMembro(membroId: number, aprovadorId: number) {
    const membro = await this.prisma.membroClube.findUnique({
      where: { id: membroId },
      include: {
        usuario: {
          select: {
            nome: true,
            email: true,
          },
        },
        clube: {
          select: {
            nome: true,
          },
        },
      },
    });

    if (!membro) {
      throw new NotFoundException(`Membro com ID ${membroId} não encontrado`);
    }

    if (membro.status !== StatusMembro.PENDENTE) {
      throw new BadRequestException('Apenas solicitações pendentes podem ser rejeitadas');
    }

    const aprovador = await this.prisma.usuario.findUnique({
      where: { id: aprovadorId },
    });

    if (!aprovador) {
      throw new NotFoundException('Aprovador não encontrado');
    }

    const ehMaster = aprovador.papelGlobal === PapelGlobal.MASTER;
    const membroAdminClube = await this.prisma.membroClube.findFirst({
      where: {
        usuarioId: aprovadorId,
        clubeId: membro.clubeId,
        papel: PapelClube.ADMIN_CLUBE,
        status: StatusMembro.ATIVO,
      },
    });

    if (!ehMaster && !membroAdminClube) {
      throw new ForbiddenException(
        'Apenas MASTER ou ADMIN_CLUBE podem rejeitar membros',
      );
    }

    await this.prisma.membroClube.delete({
      where: { id: membroId },
    });

    try {
      await this.emailService.enviarEmailSolicitacaoRejeitada(
        membro.usuario.email,
        membro.usuario.nome,
        membro.clube.nome,
      );
    } catch (error) {
      console.error('Erro ao enviar email de rejeição:', error);
    }

    return { message: 'Solicitação rejeitada com sucesso' };
  }

  async listarSolicitacoes(clubeId: number, aprovadorId: number) {
    const aprovador = await this.prisma.usuario.findUnique({
      where: { id: aprovadorId },
    });

    if (!aprovador) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const ehMaster = aprovador.papelGlobal === PapelGlobal.MASTER;
    const membroAdminClube = await this.prisma.membroClube.findFirst({
      where: {
        usuarioId: aprovadorId,
        clubeId,
        papel: PapelClube.ADMIN_CLUBE,
        status: StatusMembro.ATIVO,
      },
    });

    if (!ehMaster && !membroAdminClube) {
      throw new ForbiddenException(
        'Apenas MASTER ou ADMIN_CLUBE podem visualizar solicitações',
      );
    }

    return this.prisma.membroClube.findMany({
      where: {
        clubeId,
        status: StatusMembro.PENDENTE,
      },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
        unidade: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
      orderBy: {
        criadoEm: 'asc',
      },
    });
  }

  async findAll(clubeId?: number) {
    const where = clubeId ? { clubeId } : {};

    return this.prisma.membroClube.findMany({
      where,
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
        clube: {
          select: {
            id: true,
            nome: true,
            slug: true,
          },
        },
        unidade: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
      orderBy: {
        criadoEm: 'desc',
      },
    });
  }

  async findOne(id: number) {
    const membro = await this.prisma.membroClube.findUnique({
      where: { id },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
        clube: {
          select: {
            id: true,
            nome: true,
            slug: true,
          },
        },
        unidade: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    });

    if (!membro) {
      throw new NotFoundException(`Membro com ID ${id} não encontrado`);
    }

    return membro;
  }

  async update(id: number, updateMembroDto: UpdateMembroDto, usuarioId: number) {
    const membro = await this.findOne(id);

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const ehMaster = usuario.papelGlobal === PapelGlobal.MASTER;
    const membroAdminClube = await this.prisma.membroClube.findFirst({
      where: {
        usuarioId,
        clubeId: membro.clubeId,
        papel: PapelClube.ADMIN_CLUBE,
        status: StatusMembro.ATIVO,
      },
    });

    if (!ehMaster && !membroAdminClube) {
      throw new ForbiddenException(
        'Apenas MASTER ou ADMIN_CLUBE podem editar membros',
      );
    }

    if (updateMembroDto.unidadeId) {
      const unidade = await this.prisma.unidade.findUnique({
        where: { id: updateMembroDto.unidadeId },
      });

      if (!unidade) {
        throw new NotFoundException(
          `Unidade com ID ${updateMembroDto.unidadeId} não encontrada`,
        );
      }

      if (unidade.clubeId !== membro.clubeId) {
        throw new BadRequestException(
          'A unidade informada não pertence ao clube do membro',
        );
      }
    }

    return this.prisma.membroClube.update({
      where: { id },
      data: updateMembroDto,
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
        clube: {
          select: {
            id: true,
            nome: true,
            slug: true,
          },
        },
        unidade: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    });
  }

  async remove(id: number, usuarioId: number) {
    const membro = await this.findOne(id);

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const ehMaster = usuario.papelGlobal === PapelGlobal.MASTER;
    const ehProprioMembro = membro.usuarioId === usuarioId;
    const membroAdminClube = await this.prisma.membroClube.findFirst({
      where: {
        usuarioId,
        clubeId: membro.clubeId,
        papel: PapelClube.ADMIN_CLUBE,
        status: StatusMembro.ATIVO,
      },
    });

    if (!ehMaster && !ehProprioMembro && !membroAdminClube) {
      throw new ForbiddenException(
        'Você não tem permissão para remover este membro',
      );
    }

    await this.prisma.membroClube.delete({
      where: { id },
    });

    return { message: 'Membro removido com sucesso' };
  }

  private calcularIdade(dataNascimento: Date): number {
    const hoje = new Date();
    let idade = hoje.getFullYear() - dataNascimento.getFullYear();
    const mes = hoje.getMonth() - dataNascimento.getMonth();
    if (mes < 0 || (mes === 0 && hoje.getDate() < dataNascimento.getDate())) {
      idade--;
    }
    return idade;
  }
}
