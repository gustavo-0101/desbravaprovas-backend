import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/services/audit-log.service';
import { CreateProvaDto } from './dto/create-prova.dto';
import { UpdateProvaDto } from './dto/update-prova.dto';
import { CreateQuestaoDto } from './dto/create-questao.dto';
import { UpdateQuestaoDto } from './dto/update-questao.dto';
import { ReordenarQuestoesDto } from './dto/reordenar-questoes.dto';
import {
  PapelGlobal,
  PapelClube,
  StatusMembro,
  VisibilidadeProva,
} from '@prisma/client';

@Injectable()
export class ProvasService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  async create(usuarioId: number, dto: CreateProvaDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const membro = await this.prisma.membroClube.findFirst({
      where: {
        usuarioId,
        status: StatusMembro.ATIVO,
      },
    });

    if (!membro) {
      throw new ForbiddenException(
        'Você precisa ser membro de um clube para criar provas',
      );
    }

    if (!this.podeGerenciarProvas(membro.papel)) {
      throw new ForbiddenException(
        'Apenas ADMIN_CLUBE, DIRETORIA, CONSELHEIRO ou INSTRUTOR podem criar provas',
      );
    }

    if (
      dto.visibilidade === VisibilidadeProva.PRIVADA_UNIDADE &&
      !dto.unidadeId
    ) {
      throw new BadRequestException(
        'unidadeId é obrigatório quando visibilidade = PRIVADA_UNIDADE',
      );
    }

    if (dto.unidadeId) {
      const unidade = await this.prisma.unidade.findUnique({
        where: { id: dto.unidadeId },
      });

      if (!unidade || unidade.clubeId !== membro.clubeId) {
        throw new BadRequestException('Unidade inválida ou não pertence ao seu clube');
      }
    }

    if (dto.urlReferenciaMDA) {
      const urlCompleta = `https://mda.wiki.br/${dto.urlReferenciaMDA}`;
      console.log(`Prova criada com referência MDA Wiki: ${urlCompleta}`);
    }

    const prova = await this.prisma.prova.create({
      data: {
        titulo: dto.titulo,
        descricao: dto.descricao,
        categoria: dto.categoria,
        visibilidade: dto.visibilidade,
        unidadeId: dto.unidadeId,
        urlReferenciaMDA: dto.urlReferenciaMDA,
        clubeId: membro.clubeId,
        criadorId: usuarioId,
      },
      include: {
        clube: true,
        unidade: true,
        criador: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
      },
    });

    this.auditLog.logCreate(
      usuarioId,
      'Prova',
      prova.id,
      `Criou prova "${prova.titulo}" (${prova.categoria})`,
    );

    return prova;
  }

  async copiarProva(usuarioId: number, provaId: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const membro = await this.prisma.membroClube.findFirst({
      where: {
        usuarioId,
        status: StatusMembro.ATIVO,
      },
    });

    if (!membro) {
      throw new ForbiddenException(
        'Você precisa ser membro de um clube para copiar provas',
      );
    }

    if (!this.podeGerenciarProvas(membro.papel)) {
      throw new ForbiddenException(
        'Apenas ADMIN_CLUBE, DIRETORIA, CONSELHEIRO ou INSTRUTOR podem copiar provas',
      );
    }

    const provaOriginal = await this.prisma.prova.findUnique({
      where: { id: provaId },
      include: {
        questoes: true,
        criador: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
      },
    });

    if (!provaOriginal) {
      throw new NotFoundException('Prova não encontrada');
    }

    if (provaOriginal.visibilidade !== VisibilidadeProva.PUBLICA) {
      throw new ForbiddenException('Apenas provas públicas podem ser copiadas');
    }

    const provaCopia = await this.prisma.prova.create({
      data: {
        titulo: provaOriginal.titulo,
        descricao: provaOriginal.descricao,
        categoria: provaOriginal.categoria,
        visibilidade: VisibilidadeProva.PRIVADA_CLUBE,
        urlReferenciaMDA: provaOriginal.urlReferenciaMDA,
        clubeId: membro.clubeId,
        criadorId: usuarioId,
        autorOriginalId: provaOriginal.criadorId,
        provaOriginalId: provaOriginal.id,
        questoes: {
          create: provaOriginal.questoes.map((q) => ({
            tipo: q.tipo,
            enunciado: q.enunciado,
            opcoes: q.opcoes ?? undefined,
            respostaCorreta: q.respostaCorreta ?? undefined,
            pontuacao: q.pontuacao,
            ordem: q.ordem,
          })),
        },
      },
      include: {
        clube: true,
        criador: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
        autorOriginal: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
        questoes: true,
      },
    });

    this.auditLog.logCreate(
      usuarioId,
      'Prova',
      provaCopia.id,
      `Copiou prova pública "${provaOriginal.titulo}" do autor ${provaOriginal.criador.nome}`,
    );

    return provaCopia;
  }

  async listarBiblioteca() {
    const provas = await this.prisma.prova.findMany({
      where: {
        visibilidade: VisibilidadeProva.PUBLICA,
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
        criador: {
          select: {
            id: true,
            nome: true,
          },
        },
        _count: {
          select: {
            questoes: true,
          },
        },
      },
      orderBy: {
        criadoEm: 'desc',
      },
    });

    return provas;
  }

  async listarProvasClube(usuarioId: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const membro = await this.prisma.membroClube.findFirst({
      where: {
        usuarioId,
        status: StatusMembro.ATIVO,
      },
    });

    if (!membro) {
      throw new ForbiddenException('Você não é membro de nenhum clube');
    }

    let whereClause: any = {
      clubeId: membro.clubeId,
    };

    if (membro.papel === PapelClube.DESBRAVADOR) {
      whereClause = {
        clubeId: membro.clubeId,
        OR: [
          { visibilidade: VisibilidadeProva.PUBLICA },
          { visibilidade: VisibilidadeProva.PRIVADA_CLUBE },
          {
            visibilidade: VisibilidadeProva.PRIVADA_UNIDADE,
            unidadeId: membro.unidadeId,
          },
        ],
      };
    }

    const provas = await this.prisma.prova.findMany({
      where: whereClause,
      include: {
        clube: {
          select: {
            id: true,
            nome: true,
          },
        },
        unidade: {
          select: {
            id: true,
            nome: true,
          },
        },
        criador: {
          select: {
            id: true,
            nome: true,
          },
        },
        autorOriginal: {
          select: {
            id: true,
            nome: true,
          },
        },
        _count: {
          select: {
            questoes: true,
          },
        },
      },
      orderBy: {
        criadoEm: 'desc',
      },
    });

    return provas;
  }

  async findOne(usuarioId: number, provaId: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const prova = await this.prisma.prova.findUnique({
      where: { id: provaId },
      include: {
        clube: {
          select: {
            id: true,
            nome: true,
          },
        },
        unidade: {
          select: {
            id: true,
            nome: true,
          },
        },
        criador: {
          select: {
            id: true,
            nome: true,
          },
        },
        autorOriginal: {
          select: {
            id: true,
            nome: true,
          },
        },
        questoes: {
          select: {
            id: true,
            tipo: true,
            enunciado: true,
            opcoes: true,
            pontuacao: true,
            ordem: true,
            criadoEm: true,
            atualizadoEm: true,
          },
          orderBy: {
            ordem: 'asc',
          },
        },
      },
    });

    if (!prova) {
      throw new NotFoundException('Prova não encontrada');
    }

    if (prova.visibilidade === VisibilidadeProva.PUBLICA) {
      return prova;
    }

    const membro = await this.prisma.membroClube.findFirst({
      where: {
        usuarioId,
        clubeId: prova.clubeId,
        status: StatusMembro.ATIVO,
      },
    });

    if (!membro && usuario.papelGlobal !== PapelGlobal.MASTER) {
      throw new ForbiddenException('Você não tem permissão para visualizar esta prova');
    }

    if (
      membro &&
      !this.podeVerProva(membro, prova) &&
      usuario.papelGlobal !== PapelGlobal.MASTER
    ) {
      throw new ForbiddenException('Você não tem permissão para visualizar esta prova');
    }

    return prova;
  }

  async update(usuarioId: number, provaId: number, dto: UpdateProvaDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const prova = await this.prisma.prova.findUnique({
      where: { id: provaId },
    });

    if (!prova) {
      throw new NotFoundException('Prova não encontrada');
    }

    const ehMaster = usuario.papelGlobal === PapelGlobal.MASTER;
    const ehCriador = prova.criadorId === usuarioId;

    const ehAdminClube = await this.prisma.membroClube.findFirst({
      where: {
        usuarioId,
        clubeId: prova.clubeId,
        papel: PapelClube.ADMIN_CLUBE,
        status: StatusMembro.ATIVO,
      },
    });

    if (!ehMaster && !ehCriador && !ehAdminClube) {
      throw new ForbiddenException(
        'Apenas o criador, ADMIN_CLUBE ou MASTER podem atualizar esta prova',
      );
    }

    if (
      dto.visibilidade === VisibilidadeProva.PRIVADA_UNIDADE &&
      !dto.unidadeId &&
      !prova.unidadeId
    ) {
      throw new BadRequestException(
        'unidadeId é obrigatório quando visibilidade = PRIVADA_UNIDADE',
      );
    }

    if (dto.unidadeId) {
      const unidade = await this.prisma.unidade.findUnique({
        where: { id: dto.unidadeId },
      });

      if (!unidade || unidade.clubeId !== prova.clubeId) {
        throw new BadRequestException('Unidade inválida ou não pertence ao clube da prova');
      }
    }

    const provaAtualizada = await this.prisma.prova.update({
      where: { id: provaId },
      data: {
        titulo: dto.titulo,
        descricao: dto.descricao,
        categoria: dto.categoria,
        visibilidade: dto.visibilidade,
        unidadeId: dto.unidadeId,
        urlReferenciaMDA: dto.urlReferenciaMDA,
      },
      include: {
        clube: true,
        unidade: true,
        criador: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
        questoes: {
          orderBy: {
            ordem: 'asc',
          },
        },
      },
    });

    this.auditLog.logUpdate(
      usuarioId,
      'Prova',
      provaId,
      `Atualizou prova "${provaAtualizada.titulo}"`,
    );

    return provaAtualizada;
  }

  async remove(usuarioId: number, provaId: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const prova = await this.prisma.prova.findUnique({
      where: { id: provaId },
    });

    if (!prova) {
      throw new NotFoundException('Prova não encontrada');
    }

    const ehMaster = usuario.papelGlobal === PapelGlobal.MASTER;
    const ehCriador = prova.criadorId === usuarioId;

    const ehAdminClube = await this.prisma.membroClube.findFirst({
      where: {
        usuarioId,
        clubeId: prova.clubeId,
        papel: PapelClube.ADMIN_CLUBE,
        status: StatusMembro.ATIVO,
      },
    });

    if (!ehMaster && !ehCriador && !ehAdminClube) {
      throw new ForbiddenException(
        'Apenas o criador, ADMIN_CLUBE ou MASTER podem remover esta prova',
      );
    }

    await this.prisma.prova.delete({
      where: { id: provaId },
    });

    this.auditLog.logDelete(
      usuarioId,
      'Prova',
      provaId,
      `Removeu prova "${prova.titulo}"`,
    );

    return { message: 'Prova removida com sucesso' };
  }

  async adicionarQuestao(
    usuarioId: number,
    provaId: number,
    dto: CreateQuestaoDto,
  ) {
    const prova = await this.prisma.prova.findUnique({
      where: { id: provaId },
    });

    if (!prova) {
      throw new NotFoundException('Prova não encontrada');
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const ehMaster = usuario.papelGlobal === PapelGlobal.MASTER;
    const ehCriador = prova.criadorId === usuarioId;

    const ehAdminClube = await this.prisma.membroClube.findFirst({
      where: {
        usuarioId,
        clubeId: prova.clubeId,
        papel: PapelClube.ADMIN_CLUBE,
        status: StatusMembro.ATIVO,
      },
    });

    if (!ehMaster && !ehCriador && !ehAdminClube) {
      throw new ForbiddenException(
        'Apenas o criador, ADMIN_CLUBE ou MASTER podem adicionar questões',
      );
    }

    const questao = await this.prisma.questao.create({
      data: {
        provaId,
        tipo: dto.tipo,
        enunciado: dto.enunciado,
        opcoes: dto.opcoes,
        respostaCorreta: dto.respostaCorreta,
        pontuacao: dto.pontuacao || 1,
        ordem: dto.ordem,
      },
    });

    this.auditLog.logCreate(
      usuarioId,
      'Questao',
      questao.id,
      `Adicionou questão à prova "${prova.titulo}"`,
    );

    return questao;
  }

  async atualizarQuestao(
    usuarioId: number,
    questaoId: number,
    dto: UpdateQuestaoDto,
  ) {
    const questao = await this.prisma.questao.findUnique({
      where: { id: questaoId },
      include: {
        prova: true,
      },
    });

    if (!questao) {
      throw new NotFoundException('Questão não encontrada');
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const ehMaster = usuario.papelGlobal === PapelGlobal.MASTER;
    const ehCriador = questao.prova.criadorId === usuarioId;

    const ehAdminClube = await this.prisma.membroClube.findFirst({
      where: {
        usuarioId,
        clubeId: questao.prova.clubeId,
        papel: PapelClube.ADMIN_CLUBE,
        status: StatusMembro.ATIVO,
      },
    });

    if (!ehMaster && !ehCriador && !ehAdminClube) {
      throw new ForbiddenException(
        'Apenas o criador da prova, ADMIN_CLUBE ou MASTER podem atualizar questões',
      );
    }

    const questaoAtualizada = await this.prisma.questao.update({
      where: { id: questaoId },
      data: {
        tipo: dto.tipo,
        enunciado: dto.enunciado,
        opcoes: dto.opcoes,
        respostaCorreta: dto.respostaCorreta,
        pontuacao: dto.pontuacao,
        ordem: dto.ordem,
      },
    });

    this.auditLog.logUpdate(
      usuarioId,
      'Questao',
      questaoId,
      `Atualizou questão da prova "${questao.prova.titulo}"`,
    );

    return questaoAtualizada;
  }

  async removerQuestao(usuarioId: number, questaoId: number) {
    const questao = await this.prisma.questao.findUnique({
      where: { id: questaoId },
      include: {
        prova: true,
      },
    });

    if (!questao) {
      throw new NotFoundException('Questão não encontrada');
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const ehMaster = usuario.papelGlobal === PapelGlobal.MASTER;
    const ehCriador = questao.prova.criadorId === usuarioId;

    const ehAdminClube = await this.prisma.membroClube.findFirst({
      where: {
        usuarioId,
        clubeId: questao.prova.clubeId,
        papel: PapelClube.ADMIN_CLUBE,
        status: StatusMembro.ATIVO,
      },
    });

    if (!ehMaster && !ehCriador && !ehAdminClube) {
      throw new ForbiddenException(
        'Apenas o criador da prova, ADMIN_CLUBE ou MASTER podem remover questões',
      );
    }

    await this.prisma.questao.delete({
      where: { id: questaoId },
    });

    this.auditLog.logDelete(
      usuarioId,
      'Questao',
      questaoId,
      `Removeu questão da prova "${questao.prova.titulo}"`,
    );

    return { message: 'Questão removida com sucesso' };
  }

  async reordenarQuestoes(
    usuarioId: number,
    provaId: number,
    dto: ReordenarQuestoesDto,
  ) {
    const prova = await this.prisma.prova.findUnique({
      where: { id: provaId },
      include: {
        questoes: true,
      },
    });

    if (!prova) {
      throw new NotFoundException('Prova não encontrada');
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const ehMaster = usuario.papelGlobal === PapelGlobal.MASTER;
    const ehCriador = prova.criadorId === usuarioId;

    const ehAdminClube = await this.prisma.membroClube.findFirst({
      where: {
        usuarioId,
        clubeId: prova.clubeId,
        papel: PapelClube.ADMIN_CLUBE,
        status: StatusMembro.ATIVO,
      },
    });

    if (!ehMaster && !ehCriador && !ehAdminClube) {
      throw new ForbiddenException(
        'Apenas o criador, ADMIN_CLUBE ou MASTER podem reordenar questões',
      );
    }

    if (dto.questoesIds.length !== prova.questoes.length) {
      throw new BadRequestException(
        'O número de questões fornecido não corresponde ao número de questões da prova',
      );
    }

    const questoesProva = prova.questoes.map((q) => q.id).sort();
    const questoesFornecidas = [...dto.questoesIds].sort();

    if (JSON.stringify(questoesProva) !== JSON.stringify(questoesFornecidas)) {
      throw new BadRequestException(
        'Os IDs fornecidos não correspondem às questões da prova',
      );
    }

    await Promise.all(
      dto.questoesIds.map((questaoId, index) =>
        this.prisma.questao.update({
          where: { id: questaoId },
          data: { ordem: index + 1 },
        }),
      ),
    );

    this.auditLog.logUpdate(
      usuarioId,
      'Prova',
      provaId,
      `Reordenou questões da prova "${prova.titulo}"`,
    );

    const questoesAtualizadas = await this.prisma.questao.findMany({
      where: { provaId },
      orderBy: { ordem: 'asc' },
    });

    return questoesAtualizadas;
  }

  private podeGerenciarProvas(papel: PapelClube): boolean {
    const papeisPermitidos: PapelClube[] = [
      PapelClube.ADMIN_CLUBE,
      PapelClube.DIRETORIA,
      PapelClube.CONSELHEIRO,
      PapelClube.INSTRUTOR,
    ];
    return papeisPermitidos.includes(papel);
  }

  private podeVerProva(membro: any, prova: any): boolean {
    if (prova.visibilidade === VisibilidadeProva.PUBLICA) {
      return true;
    }

    if (
      prova.visibilidade === VisibilidadeProva.PRIVADA_CLUBE &&
      prova.clubeId === membro.clubeId
    ) {
      return true;
    }

    if (
      prova.visibilidade === VisibilidadeProva.PRIVADA_UNIDADE &&
      prova.clubeId === membro.clubeId &&
      prova.unidadeId === membro.unidadeId
    ) {
      return true;
    }

    return false;
  }
}
