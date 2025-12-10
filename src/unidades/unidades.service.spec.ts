import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { UnidadesService } from './unidades.service';
import { PrismaService } from '../prisma/prisma.service';
import { PapelGlobal, PapelClube, StatusMembro } from '@prisma/client';

describe('UnidadesService', () => {
  let service: UnidadesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    usuario: {
      findUnique: jest.fn(),
    },
    unidade: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    clube: {
      findUnique: jest.fn(),
    },
    membroClube: {
      findFirst: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnidadesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UnidadesService>(UnidadesService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      clubeId: 1,
      nome: 'Unidade Teste',
    };

    it('should create unidade successfully for MASTER', async () => {
      const mockUsuario = { id: 1, papelGlobal: PapelGlobal.MASTER };
      const mockClube = { id: 1, nome: 'Clube Teste' };

      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);
      mockPrismaService.clube.findUnique.mockResolvedValue(mockClube);
      mockPrismaService.unidade.create.mockResolvedValue({
        id: 1,
        ...createDto,
      });

      const result = await service.create(createDto, 1);

      expect(result).toHaveProperty('id');
      expect(result.nome).toBe(createDto.nome);
    });

    it('should create unidade successfully for ADMIN_CLUBE', async () => {
      const mockUsuario = { id: 2, papelGlobal: PapelGlobal.USUARIO };
      const mockClube = { id: 1, nome: 'Clube Teste' };
      const mockMembroAdmin = { papel: PapelClube.ADMIN_CLUBE, status: StatusMembro.ATIVO };

      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);
      mockPrismaService.clube.findUnique.mockResolvedValue(mockClube);
      mockPrismaService.membroClube.findFirst.mockResolvedValue(mockMembroAdmin);
      mockPrismaService.unidade.create.mockResolvedValue({ id: 1, ...createDto });

      const result = await service.create(createDto, 2);

      expect(result).toHaveProperty('id');
    });

    it('should throw ForbiddenException if user has no permission', async () => {
      const mockUsuario = { id: 3, papelGlobal: PapelGlobal.USUARIO };
      const mockClube = { id: 1, nome: 'Clube Teste' };

      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);
      mockPrismaService.clube.findUnique.mockResolvedValue(mockClube);
      mockPrismaService.membroClube.findFirst.mockResolvedValue(null);

      await expect(service.create(createDto, 3)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if clube not found', async () => {
      const mockUsuario = { id: 1, papelGlobal: PapelGlobal.MASTER };

      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);
      mockPrismaService.clube.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all unidades when no clubeId provided', async () => {
      const mockUnidades = [
        { id: 1, nome: 'Unidade 1', clubeId: 1 },
        { id: 2, nome: 'Unidade 2', clubeId: 2 },
      ];

      mockPrismaService.unidade.findMany.mockResolvedValue(mockUnidades);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
    });

    it('should return filtered unidades when clubeId provided', async () => {
      const mockUnidades = [{ id: 1, nome: 'Unidade 1', clubeId: 1 }];

      mockPrismaService.unidade.findMany.mockResolvedValue(mockUnidades);

      const result = await service.findAll(1);

      expect(result).toHaveLength(1);
      expect(result[0].clubeId).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return unidade by id', async () => {
      const mockUnidade = { id: 1, nome: 'Unidade Teste', clubeId: 1 };

      mockPrismaService.unidade.findUnique.mockResolvedValue(mockUnidade);

      const result = await service.findOne(1);

      expect(result).toEqual(mockUnidade);
    });

    it('should throw NotFoundException if unidade not found', async () => {
      mockPrismaService.unidade.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto = { nome: 'Unidade Atualizada' };

    it('should update unidade successfully for MASTER', async () => {
      const mockUnidade = { id: 1, nome: 'Unidade Original', clubeId: 1 };
      const mockUsuario = { id: 1, papelGlobal: PapelGlobal.MASTER };

      mockPrismaService.unidade.findUnique.mockResolvedValue(mockUnidade);
      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);
      mockPrismaService.unidade.update.mockResolvedValue({ ...mockUnidade, ...updateDto });

      const result = await service.update(1, updateDto, 1);

      expect(result.nome).toBe(updateDto.nome);
    });

    it('should throw ForbiddenException if user has no permission', async () => {
      const mockUnidade = { id: 1, nome: 'Unidade Original', clubeId: 1 };
      const mockUsuario = { id: 99, papelGlobal: PapelGlobal.USUARIO };

      mockPrismaService.unidade.findUnique.mockResolvedValue(mockUnidade);
      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);
      mockPrismaService.membroClube.findFirst.mockResolvedValue(null);

      await expect(service.update(1, updateDto, 99)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should delete unidade successfully', async () => {
      const mockUnidade = { id: 1, nome: 'Unidade Teste', clubeId: 1 };
      const mockUsuario = { id: 1, papelGlobal: PapelGlobal.MASTER };

      mockPrismaService.unidade.findUnique.mockResolvedValue(mockUnidade);
      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);
      mockPrismaService.membroClube.count.mockResolvedValue(0);
      mockPrismaService.unidade.delete.mockResolvedValue({ message: 'Unidade deletada com sucesso' });

      const result = await service.remove(1, 1);

      expect(result).toHaveProperty('message');
    });

    it('should throw BadRequestException if unidade has members', async () => {
      const mockUnidade = { id: 1, nome: 'Unidade Teste', clubeId: 1 };
      const mockUsuario = { id: 1, papelGlobal: PapelGlobal.MASTER };

      mockPrismaService.unidade.findUnique.mockResolvedValue(mockUnidade);
      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);
      mockPrismaService.membroClube.count.mockResolvedValue(5);

      await expect(service.remove(1, 1)).rejects.toThrow(BadRequestException);
    });
  });
});
