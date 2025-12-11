import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { MembrosService } from './membros.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { PapelGlobal, PapelClube, StatusMembro } from '@prisma/client';

describe('MembrosService', () => {
  let service: MembrosService;
  let prisma: PrismaService;
  let emailService: EmailService;

  const mockPrismaService = {
    usuario: {
      findUnique: jest.fn(),
    },
    clube: {
      findUnique: jest.fn(),
    },
    unidade: {
      findUnique: jest.fn(),
    },
    membroClube: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockEmailService = {
    enviarEmailNovaSolicitacaoMembro: jest.fn(),
    enviarEmailSolicitacaoAprovada: jest.fn(),
    enviarEmailSolicitacaoRejeitada: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembrosService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<MembrosService>(MembrosService);
    prisma = module.get<PrismaService>(PrismaService);
    emailService = module.get<EmailService>(EmailService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('solicitarVinculo', () => {
    const dto = {
      clubeId: 1,
      papelDesejado: PapelClube.CONSELHEIRO,
      dataNascimento: '1990-01-01',
      batizado: true,
      unidadeId: 1,
    };

    it('should create solicitação successfully', async () => {
      const mockClube = { id: 1, nome: 'Clube Teste', slug: 'clube-teste' };
      const mockUnidade = { id: 1, nome: 'Unidade Teste', clubeId: 1 };
      const mockMembro = {
        id: 1,
        usuarioId: 1,
        clubeId: 1,
        unidadeId: 1,
        papel: PapelClube.CONSELHEIRO,
        status: StatusMembro.PENDENTE,
        usuario: { id: 1, nome: 'Teste', email: 'teste@example.com' },
        clube: mockClube,
        unidade: mockUnidade,
      };

      mockPrismaService.clube.findUnique.mockResolvedValue(mockClube);
      mockPrismaService.membroClube.findUnique.mockResolvedValue(null);
      mockPrismaService.unidade.findUnique.mockResolvedValue(mockUnidade);
      mockPrismaService.membroClube.create.mockResolvedValue(mockMembro);
      mockPrismaService.membroClube.findFirst.mockResolvedValue(null); // No ADMIN_CLUBE

      const result = await service.solicitarVinculo(dto, 1);

      expect(result).toHaveProperty('id');
      expect(result.papel).toBe(PapelClube.CONSELHEIRO);
    });

    it('should auto-assign INSTRUTOR for non-baptized 18+ years', async () => {
      const dtoInstrutor = {
        ...dto,
        batizado: false,
        dataNascimento: '2000-01-01', // 25 anos
      };

      const mockClube = { id: 1, nome: 'Clube Teste', slug: 'clube-teste' };
      const mockUnidade = { id: 1, nome: 'Unidade Teste', clubeId: 1 };
      const mockMembro = {
        id: 1,
        usuarioId: 1,
        clubeId: 1,
        unidadeId: 1,
        papel: PapelClube.INSTRUTOR,
        status: StatusMembro.PENDENTE,
        usuario: { id: 1, nome: 'Teste', email: 'teste@example.com' },
        clube: mockClube,
        unidade: mockUnidade,
      };

      mockPrismaService.clube.findUnique.mockResolvedValue(mockClube);
      mockPrismaService.membroClube.findUnique.mockResolvedValue(null);
      mockPrismaService.unidade.findUnique.mockResolvedValue(mockUnidade);
      mockPrismaService.membroClube.create.mockResolvedValue(mockMembro);
      mockPrismaService.membroClube.findFirst.mockResolvedValue(null);

      const result = await service.solicitarVinculo(dtoInstrutor, 1);

      expect(result.papel).toBe(PapelClube.INSTRUTOR);
    });

    it('should throw BadRequestException for CONSELHEIRO under 16 years', async () => {
      const dtoMenor = {
        ...dto,
        dataNascimento: '2020-01-01', // Criança
      };

      const mockClube = { id: 1, nome: 'Clube Teste', slug: 'clube-teste' };

      mockPrismaService.clube.findUnique.mockResolvedValue(mockClube);
      mockPrismaService.membroClube.findUnique.mockResolvedValue(null);

      await expect(service.solicitarVinculo(dtoMenor, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if clube not found', async () => {
      mockPrismaService.clube.findUnique.mockResolvedValue(null);

      await expect(service.solicitarVinculo(dto, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if vínculo already exists', async () => {
      const mockClube = { id: 1, nome: 'Clube Teste', slug: 'clube-teste' };
      const mockVinculo = { id: 1, usuarioId: 1, clubeId: 1 };

      mockPrismaService.clube.findUnique.mockResolvedValue(mockClube);
      mockPrismaService.membroClube.findUnique.mockResolvedValue(mockVinculo);

      await expect(service.solicitarVinculo(dto, 1)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when papel requires unidade but not provided', async () => {
      const dtoSemUnidade = {
        ...dto,
        papelDesejado: PapelClube.DESBRAVADOR,
        unidadeId: undefined,
      };

      const mockClube = { id: 1, nome: 'Clube Teste', slug: 'clube-teste' };

      mockPrismaService.clube.findUnique.mockResolvedValue(mockClube);
      mockPrismaService.membroClube.findUnique.mockResolvedValue(null);

      await expect(service.solicitarVinculo(dtoSemUnidade, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for CONSELHEIRO not baptized (under 18)', async () => {
      const dtoConselheiroNaoBatizado = {
        ...dto,
        papelDesejado: PapelClube.CONSELHEIRO,
        batizado: false,
        dataNascimento: '2010-01-01', // Menor de 18
      };

      const mockClube = { id: 1, nome: 'Clube Teste', slug: 'clube-teste' };

      mockPrismaService.clube.findUnique.mockResolvedValue(mockClube);
      mockPrismaService.membroClube.findUnique.mockResolvedValue(null);

      await expect(service.solicitarVinculo(dtoConselheiroNaoBatizado, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if unidade not found', async () => {
      const mockClube = { id: 1, nome: 'Clube Teste', slug: 'clube-teste' };

      mockPrismaService.clube.findUnique.mockResolvedValue(mockClube);
      mockPrismaService.membroClube.findUnique.mockResolvedValue(null);
      mockPrismaService.unidade.findUnique.mockResolvedValue(null);

      await expect(service.solicitarVinculo(dto, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if unidade does not belong to clube', async () => {
      const mockClube = { id: 1, nome: 'Clube Teste', slug: 'clube-teste' };
      const mockUnidadeErrada = { id: 1, nome: 'Unidade Teste', clubeId: 999 };

      mockPrismaService.clube.findUnique.mockResolvedValue(mockClube);
      mockPrismaService.membroClube.findUnique.mockResolvedValue(null);
      mockPrismaService.unidade.findUnique.mockResolvedValue(mockUnidadeErrada);

      await expect(service.solicitarVinculo(dto, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when trying to request ADMIN_CLUBE', async () => {
      const dtoAdminClube = {
        ...dto,
        papelDesejado: PapelClube.ADMIN_CLUBE,
      };

      const mockClube = { id: 1, nome: 'Clube Teste', slug: 'clube-teste' };
      const mockUnidade = { id: 1, nome: 'Unidade Teste', clubeId: 1 };

      mockPrismaService.clube.findUnique.mockResolvedValue(mockClube);
      mockPrismaService.membroClube.findUnique.mockResolvedValue(null);
      mockPrismaService.unidade.findUnique.mockResolvedValue(mockUnidade);

      await expect(service.solicitarVinculo(dtoAdminClube, 1)).rejects.toThrow(BadRequestException);
    });

    it('should handle email sending error gracefully', async () => {
      const mockClube = { id: 1, nome: 'Clube Teste', slug: 'clube-teste' };
      const mockUnidade = { id: 1, nome: 'Unidade Teste', clubeId: 1 };
      const mockMembro = {
        id: 1,
        usuarioId: 1,
        clubeId: 1,
        unidadeId: 1,
        papel: PapelClube.CONSELHEIRO,
        status: StatusMembro.PENDENTE,
        usuario: { id: 1, nome: 'Teste', email: 'teste@example.com' },
        clube: mockClube,
        unidade: mockUnidade,
      };
      const mockAdminClube = {
        id: 2,
        usuarioId: 2,
        clubeId: 1,
        papel: PapelClube.ADMIN_CLUBE,
        status: StatusMembro.ATIVO,
        usuario: { nome: 'Admin', email: 'admin@example.com' },
      };

      mockPrismaService.clube.findUnique.mockResolvedValue(mockClube);
      mockPrismaService.membroClube.findUnique.mockResolvedValue(null);
      mockPrismaService.unidade.findUnique.mockResolvedValue(mockUnidade);
      mockPrismaService.membroClube.create.mockResolvedValue(mockMembro);
      mockPrismaService.membroClube.findFirst.mockResolvedValue(mockAdminClube);
      mockEmailService.enviarEmailNovaSolicitacaoMembro.mockRejectedValue(new Error('Email error'));

      const result = await service.solicitarVinculo(dto, 1);

      expect(result).toHaveProperty('id');
    });
  });

  describe('aprovarMembro', () => {
    const aprovarDto = {
      papel: PapelClube.CONSELHEIRO,
      unidadeId: 1,
    };

    it('should approve membro successfully for MASTER', async () => {
      const mockMembro = {
        id: 1,
        usuarioId: 2,
        clubeId: 1,
        status: StatusMembro.PENDENTE,
        usuario: { id: 2, nome: 'Membro', email: 'membro@example.com' },
        clube: { id: 1, nome: 'Clube Teste' },
      };
      const mockUsuario = { id: 1, papelGlobal: PapelGlobal.MASTER };
      const mockUnidade = { id: 1, nome: 'Unidade Teste', clubeId: 1 };
      const mockMembroAprovado = {
        ...mockMembro,
        status: StatusMembro.ATIVO,
        papel: PapelClube.CONSELHEIRO,
        unidade: { id: 1, nome: 'Unidade Teste' },
      };

      mockPrismaService.membroClube.findUnique.mockResolvedValue(mockMembro);
      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);
      mockPrismaService.unidade.findUnique.mockResolvedValue(mockUnidade);
      mockPrismaService.membroClube.update.mockResolvedValue(mockMembroAprovado);

      const result = await service.aprovarMembro(1, aprovarDto, 1);

      expect(result.status).toBe(StatusMembro.ATIVO);
      expect(mockEmailService.enviarEmailSolicitacaoAprovada).toHaveBeenCalled();
    });

    it('should throw BadRequestException if membro already processed', async () => {
      const mockMembro = {
        id: 1,
        usuarioId: 2,
        clubeId: 1,
        status: StatusMembro.ATIVO, // Já aprovado
        usuario: { id: 2, nome: 'Membro', email: 'membro@example.com' },
        clube: { id: 1, nome: 'Clube Teste' },
      };

      mockPrismaService.membroClube.findUnique.mockResolvedValue(mockMembro);

      await expect(service.aprovarMembro(1, aprovarDto, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if user has no permission', async () => {
      const mockMembro = {
        id: 1,
        usuarioId: 2,
        clubeId: 1,
        status: StatusMembro.PENDENTE,
        usuario: { id: 2, nome: 'Membro', email: 'membro@example.com' },
        clube: { id: 1, nome: 'Clube Teste' },
      };
      const mockUsuario = { id: 99, papelGlobal: PapelGlobal.USUARIO };

      mockPrismaService.membroClube.findUnique.mockResolvedValue(mockMembro);
      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);
      mockPrismaService.membroClube.findFirst.mockResolvedValue(null);

      await expect(service.aprovarMembro(1, aprovarDto, 99)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('rejeitarMembro', () => {
    it('should reject membro successfully', async () => {
      const mockMembro = {
        id: 1,
        usuarioId: 2,
        clubeId: 1,
        status: StatusMembro.PENDENTE,
        usuario: { nome: 'Membro', email: 'membro@example.com' },
        clube: { nome: 'Clube Teste' },
      };
      const mockUsuario = { id: 1, papelGlobal: PapelGlobal.MASTER };

      mockPrismaService.membroClube.findUnique.mockResolvedValue(mockMembro);
      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);
      mockPrismaService.membroClube.delete.mockResolvedValue(mockMembro);

      const result = await service.rejeitarMembro(1, 1);

      expect(result).toHaveProperty('message');
      expect(mockEmailService.enviarEmailSolicitacaoRejeitada).toHaveBeenCalled();
    });

    it('should throw BadRequestException if not PENDENTE', async () => {
      const mockMembro = {
        id: 1,
        usuarioId: 2,
        clubeId: 1,
        status: StatusMembro.ATIVO,
        usuario: { nome: 'Membro', email: 'membro@example.com' },
        clube: { nome: 'Clube Teste' },
      };

      mockPrismaService.membroClube.findUnique.mockResolvedValue(mockMembro);

      await expect(service.rejeitarMembro(1, 1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return all membros', async () => {
      const mockMembros = [
        { id: 1, usuarioId: 1, clubeId: 1 },
        { id: 2, usuarioId: 2, clubeId: 2 },
      ];

      mockPrismaService.membroClube.findMany.mockResolvedValue(mockMembros);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
    });

    it('should return filtered membros by clubeId', async () => {
      const mockMembros = [{ id: 1, usuarioId: 1, clubeId: 1 }];

      mockPrismaService.membroClube.findMany.mockResolvedValue(mockMembros);

      const result = await service.findAll(1);

      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return membro by id', async () => {
      const mockMembro = { id: 1, usuarioId: 1, clubeId: 1 };

      mockPrismaService.membroClube.findUnique.mockResolvedValue(mockMembro);

      const result = await service.findOne(1);

      expect(result).toEqual(mockMembro);
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.membroClube.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('listarSolicitacoes', () => {
    it('should list pending solicitações for MASTER', async () => {
      const mockUsuario = { id: 1, papelGlobal: PapelGlobal.MASTER };
      const mockSolicitacoes = [
        {
          id: 1,
          usuarioId: 2,
          clubeId: 1,
          status: StatusMembro.PENDENTE,
          usuario: { id: 2, nome: 'João', email: 'joao@test.com' },
          unidade: { id: 1, nome: 'Unidade A' },
        },
      ];

      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);
      mockPrismaService.membroClube.findFirst.mockResolvedValue(null); // Não é ADMIN_CLUBE
      mockPrismaService.membroClube.findMany.mockResolvedValue(mockSolicitacoes);

      const result = await service.listarSolicitacoes(1, 1);

      expect(result).toEqual(mockSolicitacoes);
      expect(mockPrismaService.membroClube.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clubeId: 1, status: StatusMembro.PENDENTE },
        }),
      );
    });

    it('should list pending solicitações for ADMIN_CLUBE', async () => {
      const mockUsuario = { id: 2, papelGlobal: PapelGlobal.USUARIO };
      const mockMembroAdminClube = {
        id: 10,
        usuarioId: 2,
        clubeId: 1,
        papel: PapelClube.ADMIN_CLUBE,
        status: StatusMembro.ATIVO,
      };
      const mockSolicitacoes = [
        {
          id: 1,
          usuarioId: 3,
          clubeId: 1,
          status: StatusMembro.PENDENTE,
        },
      ];

      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);
      mockPrismaService.membroClube.findFirst.mockResolvedValue(mockMembroAdminClube);
      mockPrismaService.membroClube.findMany.mockResolvedValue(mockSolicitacoes);

      const result = await service.listarSolicitacoes(1, 2);

      expect(result).toEqual(mockSolicitacoes);
    });

    it('should throw ForbiddenException if user is not MASTER or ADMIN_CLUBE', async () => {
      const mockUsuario = { id: 3, papelGlobal: PapelGlobal.USUARIO };

      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);
      mockPrismaService.membroClube.findFirst.mockResolvedValue(null);

      await expect(service.listarSolicitacoes(1, 3)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    it('should update membro for MASTER', async () => {
      const mockMembro = {
        id: 1,
        usuarioId: 2,
        clubeId: 1,
        unidadeId: 1,
        papel: PapelClube.DESBRAVADOR,
        status: StatusMembro.ATIVO,
      };
      const mockUsuario = { id: 1, papelGlobal: PapelGlobal.MASTER };
      const mockUpdatedMembro = { ...mockMembro, papel: PapelClube.CONSELHEIRO };

      mockPrismaService.membroClube.findUnique.mockResolvedValue(mockMembro);
      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);
      mockPrismaService.membroClube.update.mockResolvedValue(mockUpdatedMembro);

      const result = await service.update(1, { papel: PapelClube.CONSELHEIRO }, 1);

      expect(result).toEqual(mockUpdatedMembro);
      expect(mockPrismaService.membroClube.update).toHaveBeenCalled();
    });

    it('should update membro for ADMIN_CLUBE', async () => {
      const mockMembro = {
        id: 1,
        usuarioId: 2,
        clubeId: 1,
        unidadeId: 1,
        papel: PapelClube.DESBRAVADOR,
        status: StatusMembro.ATIVO,
      };
      const mockUsuario = { id: 3, papelGlobal: PapelGlobal.USUARIO };
      const mockMembroAdminClube = {
        id: 10,
        usuarioId: 3,
        clubeId: 1,
        papel: PapelClube.ADMIN_CLUBE,
        status: StatusMembro.ATIVO,
      };
      const mockUpdatedMembro = { ...mockMembro, papel: PapelClube.CONSELHEIRO };

      mockPrismaService.membroClube.findUnique.mockResolvedValue(mockMembro);
      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);
      mockPrismaService.membroClube.findFirst.mockResolvedValue(mockMembroAdminClube);
      mockPrismaService.membroClube.update.mockResolvedValue(mockUpdatedMembro);

      const result = await service.update(1, { papel: PapelClube.CONSELHEIRO }, 3);

      expect(result).toEqual(mockUpdatedMembro);
    });

    it('should throw ForbiddenException if user is not MASTER or ADMIN_CLUBE', async () => {
      const mockMembro = {
        id: 1,
        usuarioId: 2,
        clubeId: 1,
        papel: PapelClube.DESBRAVADOR,
        status: StatusMembro.ATIVO,
      };
      const mockUsuario = { id: 4, papelGlobal: PapelGlobal.USUARIO };

      mockPrismaService.membroClube.findUnique.mockResolvedValue(mockMembro);
      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);
      mockPrismaService.membroClube.findFirst.mockResolvedValue(null);

      await expect(
        service.update(1, { papel: PapelClube.CONSELHEIRO }, 4),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if unidade does not belong to clube', async () => {
      const mockMembro = {
        id: 1,
        usuarioId: 2,
        clubeId: 1,
        unidadeId: 1,
        papel: PapelClube.DESBRAVADOR,
        status: StatusMembro.ATIVO,
      };
      const mockUsuario = { id: 1, papelGlobal: PapelGlobal.MASTER };
      const mockUnidade = { id: 2, nome: 'Unidade B', clubeId: 999 }; // Clube diferente

      mockPrismaService.membroClube.findUnique.mockResolvedValue(mockMembro);
      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);
      mockPrismaService.unidade.findUnique.mockResolvedValue(mockUnidade);

      await expect(service.update(1, { unidadeId: 2 }, 1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('remove', () => {
    it('should remove membro for MASTER', async () => {
      const mockMembro = {
        id: 1,
        usuarioId: 2,
        clubeId: 1,
        papel: PapelClube.DESBRAVADOR,
        status: StatusMembro.ATIVO,
      };
      const mockUsuario = { id: 1, papelGlobal: PapelGlobal.MASTER };

      mockPrismaService.membroClube.findUnique.mockResolvedValue(mockMembro);
      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);
      mockPrismaService.membroClube.delete.mockResolvedValue(mockMembro);

      const result = await service.remove(1, 1);

      expect(result).toEqual({ message: 'Membro removido com sucesso' });
      expect(mockPrismaService.membroClube.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw ForbiddenException if user is not MASTER or ADMIN_CLUBE', async () => {
      const mockMembro = {
        id: 1,
        usuarioId: 2,
        clubeId: 1,
        papel: PapelClube.DESBRAVADOR,
        status: StatusMembro.ATIVO,
      };
      const mockUsuario = { id: 3, papelGlobal: PapelGlobal.USUARIO };

      mockPrismaService.membroClube.findUnique.mockResolvedValue(mockMembro);
      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);
      mockPrismaService.membroClube.findFirst.mockResolvedValue(null);

      await expect(service.remove(1, 3)).rejects.toThrow(ForbiddenException);
    });
  });
});
