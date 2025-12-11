import { Test, TestingModule } from '@nestjs/testing';
import { ProvasService } from './provas.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/services/audit-log.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import {
  PapelGlobal,
  PapelClube,
  StatusMembro,
  VisibilidadeProva,
  CategoriaEspecialidade,
  TipoQuestao,
} from '@prisma/client';

describe('ProvasService', () => {
  let service: ProvasService;
  let prisma: PrismaService;
  let auditLog: AuditLogService;

  const mockPrismaService = {
    usuario: {
      findUnique: jest.fn(),
    },
    membroClube: {
      findFirst: jest.fn(),
    },
    unidade: {
      findUnique: jest.fn(),
    },
    prova: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    questao: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockAuditLogService = {
    logCreate: jest.fn(),
    logUpdate: jest.fn(),
    logDelete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProvasService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
        },
      ],
    }).compile();

    service = module.get<ProvasService>(ProvasService);
    prisma = module.get<PrismaService>(PrismaService);
    auditLog = module.get<AuditLogService>(AuditLogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('deve criar uma prova com sucesso', async () => {
      const usuarioId = 1;
      const dto = {
        titulo: 'Primeiros Socorros',
        categoria: CategoriaEspecialidade.CIENCIA_E_SAUDE,
        visibilidade: VisibilidadeProva.PRIVADA_CLUBE,
      };

      const mockUsuario = { id: 1, papelGlobal: PapelGlobal.USUARIO };
      const mockMembro = {
        id: 1,
        usuarioId: 1,
        clubeId: 1,
        papel: PapelClube.CONSELHEIRO,
        status: StatusMembro.ATIVO,
      };
      const mockProva = {
        id: 1,
        ...dto,
        clubeId: 1,
        criadorId: 1,
        clube: { id: 1, nome: 'Clube Teste' },
        criador: { id: 1, nome: 'Teste', email: 'teste@test.com' },
      };

      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);
      mockPrismaService.membroClube.findFirst.mockResolvedValue(mockMembro);
      mockPrismaService.prova.create.mockResolvedValue(mockProva);

      const result = await service.create(usuarioId, dto as any);

      expect(result).toEqual(mockProva);
      expect(mockAuditLogService.logCreate).toHaveBeenCalledWith(
        usuarioId,
        'Prova',
        1,
        expect.stringContaining('Primeiros Socorros'),
      );
    });

    it('deve falhar se usuário não for membro de clube', async () => {
      const usuarioId = 1;
      const dto = {
        titulo: 'Teste',
        categoria: CategoriaEspecialidade.CIENCIA_E_SAUDE,
        visibilidade: VisibilidadeProva.PRIVADA_CLUBE,
      };

      mockPrismaService.usuario.findUnique.mockResolvedValue({ id: 1 });
      mockPrismaService.membroClube.findFirst.mockResolvedValue(null);

      await expect(service.create(usuarioId, dto as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deve falhar se usuário for DESBRAVADOR', async () => {
      const usuarioId = 1;
      const dto = {
        titulo: 'Teste',
        categoria: CategoriaEspecialidade.CIENCIA_E_SAUDE,
        visibilidade: VisibilidadeProva.PRIVADA_CLUBE,
      };

      mockPrismaService.usuario.findUnique.mockResolvedValue({ id: 1 });
      mockPrismaService.membroClube.findFirst.mockResolvedValue({
        papel: PapelClube.DESBRAVADOR,
        status: StatusMembro.ATIVO,
      });

      await expect(service.create(usuarioId, dto as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deve falhar se PRIVADA_UNIDADE sem unidadeId', async () => {
      const usuarioId = 1;
      const dto = {
        titulo: 'Teste',
        categoria: CategoriaEspecialidade.CIENCIA_E_SAUDE,
        visibilidade: VisibilidadeProva.PRIVADA_UNIDADE,
      };

      mockPrismaService.usuario.findUnique.mockResolvedValue({ id: 1 });
      mockPrismaService.membroClube.findFirst.mockResolvedValue({
        clubeId: 1,
        papel: PapelClube.CONSELHEIRO,
        status: StatusMembro.ATIVO,
      });

      await expect(service.create(usuarioId, dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('copiarProva', () => {
    it('deve copiar prova pública com sucesso', async () => {
      const usuarioId = 1;
      const provaId = 10;

      const mockUsuario = { id: 1, papelGlobal: PapelGlobal.USUARIO };
      const mockMembro = {
        id: 1,
        usuarioId: 1,
        clubeId: 2,
        papel: PapelClube.CONSELHEIRO,
        status: StatusMembro.ATIVO,
      };
      const mockProvaOriginal = {
        id: 10,
        titulo: 'Prova Pública',
        visibilidade: VisibilidadeProva.PUBLICA,
        criadorId: 999,
        categoria: CategoriaEspecialidade.CIENCIA_E_SAUDE,
        questoes: [
          { id: 1, tipo: TipoQuestao.MULTIPLA_ESCOLHA, enunciado: 'Q1', ordem: 1, pontuacao: 1 },
        ],
        criador: { id: 999, nome: 'Autor Original', email: 'autor@test.com' },
      };
      const mockProvaCopia = {
        id: 11,
        titulo: 'Prova Pública',
        visibilidade: VisibilidadeProva.PRIVADA_CLUBE,
        clubeId: 2,
        criadorId: 1,
        autorOriginalId: 999,
        provaOriginalId: 10,
      };

      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);
      mockPrismaService.membroClube.findFirst.mockResolvedValue(mockMembro);
      mockPrismaService.prova.findUnique.mockResolvedValue(mockProvaOriginal);
      mockPrismaService.prova.create.mockResolvedValue(mockProvaCopia);

      const result = await service.copiarProva(usuarioId, provaId);

      expect(result).toEqual(mockProvaCopia);
      expect(mockAuditLogService.logCreate).toHaveBeenCalled();
    });

    it('deve falhar se prova não for pública', async () => {
      const usuarioId = 1;
      const provaId = 10;

      mockPrismaService.usuario.findUnique.mockResolvedValue({ id: 1 });
      mockPrismaService.membroClube.findFirst.mockResolvedValue({
        clubeId: 1,
        papel: PapelClube.CONSELHEIRO,
        status: StatusMembro.ATIVO,
      });
      mockPrismaService.prova.findUnique.mockResolvedValue({
        id: 10,
        visibilidade: VisibilidadeProva.PRIVADA_CLUBE,
      });

      await expect(service.copiarProva(usuarioId, provaId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deve falhar se usuário for DESBRAVADOR', async () => {
      const usuarioId = 1;
      const provaId = 10;

      mockPrismaService.usuario.findUnique.mockResolvedValue({ id: 1 });
      mockPrismaService.membroClube.findFirst.mockResolvedValue({
        papel: PapelClube.DESBRAVADOR,
        status: StatusMembro.ATIVO,
      });

      await expect(service.copiarProva(usuarioId, provaId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('listarBiblioteca', () => {
    it('deve listar provas públicas', async () => {
      const mockProvas = [
        {
          id: 1,
          titulo: 'Prova 1',
          visibilidade: VisibilidadeProva.PUBLICA,
          _count: { questoes: 10 },
        },
        {
          id: 2,
          titulo: 'Prova 2',
          visibilidade: VisibilidadeProva.PUBLICA,
          _count: { questoes: 5 },
        },
      ];

      mockPrismaService.prova.findMany.mockResolvedValue(mockProvas);

      const result = await service.listarBiblioteca();

      expect(result).toEqual(mockProvas);
      expect(mockPrismaService.prova.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { visibilidade: VisibilidadeProva.PUBLICA },
        }),
      );
    });
  });

  describe('listarProvasClube', () => {
    it('deve listar todas as provas do clube para CONSELHEIRO', async () => {
      const usuarioId = 1;

      mockPrismaService.usuario.findUnique.mockResolvedValue({ id: 1 });
      mockPrismaService.membroClube.findFirst.mockResolvedValue({
        usuarioId: 1,
        clubeId: 1,
        papel: PapelClube.CONSELHEIRO,
        status: StatusMembro.ATIVO,
      });
      mockPrismaService.prova.findMany.mockResolvedValue([
        { id: 1, titulo: 'Prova 1' },
        { id: 2, titulo: 'Prova 2' },
      ]);

      const result = await service.listarProvasClube(usuarioId);

      expect(result).toHaveLength(2);
      expect(mockPrismaService.prova.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clubeId: 1 },
        }),
      );
    });

    it('deve filtrar provas para DESBRAVADOR', async () => {
      const usuarioId = 1;

      mockPrismaService.usuario.findUnique.mockResolvedValue({ id: 1 });
      mockPrismaService.membroClube.findFirst.mockResolvedValue({
        usuarioId: 1,
        clubeId: 1,
        unidadeId: 5,
        papel: PapelClube.DESBRAVADOR,
        status: StatusMembro.ATIVO,
      });
      mockPrismaService.prova.findMany.mockResolvedValue([]);

      await service.listarProvasClube(usuarioId);

      expect(mockPrismaService.prova.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            clubeId: 1,
            OR: expect.arrayContaining([
              { visibilidade: VisibilidadeProva.PUBLICA },
              { visibilidade: VisibilidadeProva.PRIVADA_CLUBE },
              { visibilidade: VisibilidadeProva.PRIVADA_UNIDADE, unidadeId: 5 },
            ]),
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('deve retornar prova pública sem autenticação de membro', async () => {
      const usuarioId = 1;
      const provaId = 1;

      const mockProva = {
        id: 1,
        titulo: 'Prova Pública',
        visibilidade: VisibilidadeProva.PUBLICA,
        questoes: [],
      };

      mockPrismaService.usuario.findUnique.mockResolvedValue({ id: 1 });
      mockPrismaService.prova.findUnique.mockResolvedValue(mockProva);

      const result = await service.findOne(usuarioId, provaId);

      expect(result).toEqual(mockProva);
    });

    it('deve falhar se prova não encontrada', async () => {
      const usuarioId = 1;
      const provaId = 999;

      mockPrismaService.usuario.findUnique.mockResolvedValue({ id: 1 });
      mockPrismaService.prova.findUnique.mockResolvedValue(null);

      await expect(service.findOne(usuarioId, provaId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve falhar se usuário não tiver permissão para prova privada', async () => {
      const usuarioId = 1;
      const provaId = 1;

      const mockProva = {
        id: 1,
        titulo: 'Prova Privada',
        clubeId: 99,
        visibilidade: VisibilidadeProva.PRIVADA_CLUBE,
      };

      mockPrismaService.usuario.findUnique.mockResolvedValue({
        id: 1,
        papelGlobal: PapelGlobal.USUARIO,
      });
      mockPrismaService.prova.findUnique.mockResolvedValue(mockProva);
      mockPrismaService.membroClube.findFirst.mockResolvedValue(null);

      await expect(service.findOne(usuarioId, provaId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    it('deve atualizar prova sendo criador', async () => {
      const usuarioId = 1;
      const provaId = 1;
      const dto = { titulo: 'Novo Título' };

      const mockProva = {
        id: 1,
        criadorId: 1,
        clubeId: 1,
      };
      const mockProvaAtualizada = {
        ...mockProva,
        titulo: 'Novo Título',
      };

      mockPrismaService.usuario.findUnique.mockResolvedValue({
        id: 1,
        papelGlobal: PapelGlobal.USUARIO,
      });
      mockPrismaService.prova.findUnique.mockResolvedValue(mockProva);
      mockPrismaService.prova.update.mockResolvedValue(mockProvaAtualizada);

      const result = await service.update(usuarioId, provaId, dto as any);

      expect(result).toEqual(mockProvaAtualizada);
      expect(mockAuditLogService.logUpdate).toHaveBeenCalled();
    });

    it('deve falhar se não for criador nem ADMIN_CLUBE', async () => {
      const usuarioId = 2;
      const provaId = 1;
      const dto = { titulo: 'Novo Título' };

      mockPrismaService.usuario.findUnique.mockResolvedValue({
        id: 2,
        papelGlobal: PapelGlobal.USUARIO,
      });
      mockPrismaService.prova.findUnique.mockResolvedValue({
        id: 1,
        criadorId: 1,
        clubeId: 1,
      });
      mockPrismaService.membroClube.findFirst.mockResolvedValue(null);

      await expect(service.update(usuarioId, provaId, dto as any)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('remove', () => {
    it('deve remover prova sendo criador', async () => {
      const usuarioId = 1;
      const provaId = 1;

      mockPrismaService.usuario.findUnique.mockResolvedValue({
        id: 1,
        papelGlobal: PapelGlobal.USUARIO,
      });
      mockPrismaService.prova.findUnique.mockResolvedValue({
        id: 1,
        titulo: 'Prova Teste',
        criadorId: 1,
        clubeId: 1,
      });
      mockPrismaService.prova.delete.mockResolvedValue({});

      const result = await service.remove(usuarioId, provaId);

      expect(result).toEqual({ message: 'Prova removida com sucesso' });
      expect(mockAuditLogService.logDelete).toHaveBeenCalled();
    });

    it('deve falhar se não for criador nem ADMIN_CLUBE', async () => {
      const usuarioId = 2;
      const provaId = 1;

      mockPrismaService.usuario.findUnique.mockResolvedValue({
        id: 2,
        papelGlobal: PapelGlobal.USUARIO,
      });
      mockPrismaService.prova.findUnique.mockResolvedValue({
        id: 1,
        criadorId: 1,
        clubeId: 1,
      });
      mockPrismaService.membroClube.findFirst.mockResolvedValue(null);

      await expect(service.remove(usuarioId, provaId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('adicionarQuestao', () => {
    it('deve adicionar questão sendo criador', async () => {
      const usuarioId = 1;
      const provaId = 1;
      const dto = {
        tipo: TipoQuestao.MULTIPLA_ESCOLHA,
        enunciado: 'Questão teste',
        ordem: 1,
      };

      const mockQuestao = { id: 1, ...dto, provaId: 1 };

      mockPrismaService.prova.findUnique.mockResolvedValue({
        id: 1,
        titulo: 'Prova Teste',
        criadorId: 1,
        clubeId: 1,
      });
      mockPrismaService.usuario.findUnique.mockResolvedValue({
        id: 1,
        papelGlobal: PapelGlobal.USUARIO,
      });
      mockPrismaService.questao.create.mockResolvedValue(mockQuestao);

      const result = await service.adicionarQuestao(usuarioId, provaId, dto as any);

      expect(result).toEqual(mockQuestao);
      expect(mockAuditLogService.logCreate).toHaveBeenCalled();
    });

    it('deve falhar se não for criador nem ADMIN_CLUBE', async () => {
      const usuarioId = 2;
      const provaId = 1;
      const dto = {
        tipo: TipoQuestao.MULTIPLA_ESCOLHA,
        enunciado: 'Questão teste',
        ordem: 1,
      };

      mockPrismaService.prova.findUnique.mockResolvedValue({
        id: 1,
        criadorId: 1,
        clubeId: 1,
      });
      mockPrismaService.usuario.findUnique.mockResolvedValue({
        id: 2,
        papelGlobal: PapelGlobal.USUARIO,
      });
      mockPrismaService.membroClube.findFirst.mockResolvedValue(null);

      await expect(
        service.adicionarQuestao(usuarioId, provaId, dto as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('reordenarQuestoes', () => {
    it('deve reordenar questões com sucesso', async () => {
      const usuarioId = 1;
      const provaId = 1;
      const dto = { questoesIds: [3, 1, 2] };

      const mockProva = {
        id: 1,
        titulo: 'Prova Teste',
        criadorId: 1,
        clubeId: 1,
        questoes: [
          { id: 1, ordem: 1 },
          { id: 2, ordem: 2 },
          { id: 3, ordem: 3 },
        ],
      };

      mockPrismaService.prova.findUnique.mockResolvedValue(mockProva);
      mockPrismaService.usuario.findUnique.mockResolvedValue({
        id: 1,
        papelGlobal: PapelGlobal.USUARIO,
      });
      mockPrismaService.questao.update.mockResolvedValue({});
      mockPrismaService.questao.findMany.mockResolvedValue([
        { id: 3, ordem: 1 },
        { id: 1, ordem: 2 },
        { id: 2, ordem: 3 },
      ]);

      const result = await service.reordenarQuestoes(usuarioId, provaId, dto);

      expect(result).toHaveLength(3);
      expect(mockPrismaService.questao.update).toHaveBeenCalledTimes(3);
      expect(mockAuditLogService.logUpdate).toHaveBeenCalled();
    });

    it('deve falhar se número de IDs não corresponder', async () => {
      const usuarioId = 1;
      const provaId = 1;
      const dto = { questoesIds: [1, 2] };

      mockPrismaService.prova.findUnique.mockResolvedValue({
        id: 1,
        criadorId: 1,
        clubeId: 1,
        questoes: [{ id: 1 }, { id: 2 }, { id: 3 }],
      });
      mockPrismaService.usuario.findUnique.mockResolvedValue({
        id: 1,
        papelGlobal: PapelGlobal.USUARIO,
      });

      await expect(
        service.reordenarQuestoes(usuarioId, provaId, dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve falhar se IDs não corresponderem às questões', async () => {
      const usuarioId = 1;
      const provaId = 1;
      const dto = { questoesIds: [1, 2, 99] };

      mockPrismaService.prova.findUnique.mockResolvedValue({
        id: 1,
        criadorId: 1,
        clubeId: 1,
        questoes: [{ id: 1 }, { id: 2 }, { id: 3 }],
      });
      mockPrismaService.usuario.findUnique.mockResolvedValue({
        id: 1,
        papelGlobal: PapelGlobal.USUARIO,
      });

      await expect(
        service.reordenarQuestoes(usuarioId, provaId, dto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Casos de erro adicionais', () => {
    it('create - deve falhar se unidade não pertencer ao clube', async () => {
      const usuarioId = 1;
      const dto = {
        titulo: 'Teste',
        categoria: CategoriaEspecialidade.CIENCIA_E_SAUDE,
        visibilidade: VisibilidadeProva.PRIVADA_UNIDADE,
        unidadeId: 99,
      };

      mockPrismaService.usuario.findUnique.mockResolvedValue({ id: 1 });
      mockPrismaService.membroClube.findFirst.mockResolvedValue({
        clubeId: 1,
        papel: PapelClube.CONSELHEIRO,
        status: StatusMembro.ATIVO,
      });
      mockPrismaService.unidade.findUnique.mockResolvedValue({
        id: 99,
        clubeId: 999,
      });

      await expect(service.create(usuarioId, dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('copiarProva - deve falhar se prova não encontrada', async () => {
      const usuarioId = 1;
      const provaId = 999;

      mockPrismaService.usuario.findUnique.mockResolvedValue({ id: 1 });
      mockPrismaService.membroClube.findFirst.mockResolvedValue({
        clubeId: 1,
        papel: PapelClube.CONSELHEIRO,
        status: StatusMembro.ATIVO,
      });
      mockPrismaService.prova.findUnique.mockResolvedValue(null);

      await expect(service.copiarProva(usuarioId, provaId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('listarProvasClube - deve falhar se não for membro', async () => {
      const usuarioId = 1;

      mockPrismaService.usuario.findUnique.mockResolvedValue({ id: 1 });
      mockPrismaService.membroClube.findFirst.mockResolvedValue(null);

      await expect(service.listarProvasClube(usuarioId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('findOne - deve permitir acesso a MASTER mesmo sem ser membro', async () => {
      const usuarioId = 1;
      const provaId = 1;

      const mockProva = {
        id: 1,
        titulo: 'Prova Privada',
        clubeId: 99,
        visibilidade: VisibilidadeProva.PRIVADA_CLUBE,
        questoes: [],
      };

      mockPrismaService.usuario.findUnique.mockResolvedValue({
        id: 1,
        papelGlobal: PapelGlobal.MASTER,
      });
      mockPrismaService.prova.findUnique.mockResolvedValue(mockProva);
      mockPrismaService.membroClube.findFirst.mockResolvedValue(null);

      const result = await service.findOne(usuarioId, provaId);

      expect(result).toEqual(mockProva);
    });

    it('update - deve atualizar sendo ADMIN_CLUBE', async () => {
      const usuarioId = 2;
      const provaId = 1;
      const dto = { titulo: 'Novo Título' };

      mockPrismaService.usuario.findUnique.mockResolvedValue({
        id: 2,
        papelGlobal: PapelGlobal.USUARIO,
      });
      mockPrismaService.prova.findUnique.mockResolvedValue({
        id: 1,
        criadorId: 1,
        clubeId: 1,
      });
      mockPrismaService.membroClube.findFirst.mockResolvedValue({
        usuarioId: 2,
        clubeId: 1,
        papel: PapelClube.ADMIN_CLUBE,
        status: StatusMembro.ATIVO,
      });
      mockPrismaService.prova.update.mockResolvedValue({
        id: 1,
        titulo: 'Novo Título',
      });

      const result = await service.update(usuarioId, provaId, dto as any);

      expect(result.titulo).toBe('Novo Título');
    });

    it('update - deve falhar se unidade não pertencer ao clube', async () => {
      const usuarioId = 1;
      const provaId = 1;
      const dto = {
        titulo: 'Teste',
        unidadeId: 99,
      };

      mockPrismaService.usuario.findUnique.mockResolvedValue({
        id: 1,
        papelGlobal: PapelGlobal.USUARIO,
      });
      mockPrismaService.prova.findUnique.mockResolvedValue({
        id: 1,
        criadorId: 1,
        clubeId: 1,
      });
      mockPrismaService.unidade.findUnique.mockResolvedValue({
        id: 99,
        clubeId: 999,
      });

      await expect(service.update(usuarioId, provaId, dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('update - deve falhar se PRIVADA_UNIDADE sem unidadeId', async () => {
      const usuarioId = 1;
      const provaId = 1;
      const dto = {
        visibilidade: VisibilidadeProva.PRIVADA_UNIDADE,
      };

      mockPrismaService.usuario.findUnique.mockResolvedValue({
        id: 1,
        papelGlobal: PapelGlobal.USUARIO,
      });
      mockPrismaService.prova.findUnique.mockResolvedValue({
        id: 1,
        criadorId: 1,
        clubeId: 1,
        unidadeId: null,
      });

      await expect(service.update(usuarioId, provaId, dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('remove - deve falhar se prova não encontrada', async () => {
      const usuarioId = 1;
      const provaId = 999;

      mockPrismaService.usuario.findUnique.mockResolvedValue({ id: 1 });
      mockPrismaService.prova.findUnique.mockResolvedValue(null);

      await expect(service.remove(usuarioId, provaId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('adicionarQuestao - deve falhar se prova não encontrada', async () => {
      const usuarioId = 1;
      const provaId = 999;
      const dto = {
        tipo: TipoQuestao.MULTIPLA_ESCOLHA,
        enunciado: 'Teste',
        ordem: 1,
      };

      mockPrismaService.prova.findUnique.mockResolvedValue(null);

      await expect(
        service.adicionarQuestao(usuarioId, provaId, dto as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('atualizarQuestao - deve falhar se questão não encontrada', async () => {
      const usuarioId = 1;
      const questaoId = 999;
      const dto = {
        enunciado: 'Novo enunciado',
      };

      mockPrismaService.questao.findUnique.mockResolvedValue(null);

      await expect(
        service.atualizarQuestao(usuarioId, questaoId, dto as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('removerQuestao - deve falhar se questão não encontrada', async () => {
      const usuarioId = 1;
      const questaoId = 999;

      mockPrismaService.questao.findUnique.mockResolvedValue(null);

      await expect(service.removerQuestao(usuarioId, questaoId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('reordenarQuestoes - deve falhar se prova não encontrada', async () => {
      const usuarioId = 1;
      const provaId = 999;
      const dto = { questoesIds: [1, 2, 3] };

      mockPrismaService.prova.findUnique.mockResolvedValue(null);

      await expect(
        service.reordenarQuestoes(usuarioId, provaId, dto),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
