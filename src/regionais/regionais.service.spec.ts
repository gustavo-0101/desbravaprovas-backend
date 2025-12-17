import { Test, TestingModule } from '@nestjs/testing';
import { RegionaisService } from './regionais.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/services/audit-log.service';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PapelGlobal } from '@prisma/client';

class PrismaServiceEx extends PrismaService {
  usuario: any;
  clube: any;
  regionalClube: any;
}

describe('RegionaisService', () => {
  let service: RegionaisService;
  let prisma: PrismaServiceEx;
  let auditLog: AuditLogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegionaisService,
        {
          provide: PrismaService,
          useValue: {
            usuario: {
              findUnique: jest.fn(),
            },
            clube: {
              findUnique: jest.fn(),
            },
            regionalClube: {
              findUnique: jest.fn(),
              create: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
        {
          provide: AuditLogService,
          useValue: {
            log: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RegionaisService>(RegionaisService);
    prisma = module.get<PrismaServiceEx>(PrismaService);
    auditLog = module.get<AuditLogService>(AuditLogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('vincularClube', () => {
    it('deve vincular clube a um regional com sucesso', async () => {
      // Arrange
      const regionalId = 1;
      const clubeId = 2;

      const mockRegional = {
        id: regionalId,
        email: 'regional@example.com',
        nome: 'Regional Test',
        papelGlobal: PapelGlobal.REGIONAL,
      };

      const mockClube = {
        id: clubeId,
        nome: 'Clube Test',
        cidade: 'São Paulo',
        estado: 'SP',
      };

      const mockVinculo = {
        id: 1,
        regionalId,
        clubeId,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
        clube: mockClube,
        regional: mockRegional,
      };

      jest.spyOn(prisma.usuario, 'findUnique').mockResolvedValue(mockRegional as any);
      jest.spyOn(prisma.clube, 'findUnique').mockResolvedValue(mockClube as any);
      jest.spyOn(prisma.regionalClube, 'create').mockResolvedValue(mockVinculo as any);

      // Act
      const result = await service.vincularClube(regionalId, clubeId);

      // Assert
      expect(result).toEqual(mockVinculo);
      expect(prisma.usuario.findUnique).toHaveBeenCalledWith({
        where: { id: regionalId },
      });
      expect(prisma.clube.findUnique).toHaveBeenCalledWith({
        where: { id: clubeId },
      });
      expect(prisma.regionalClube.create).toHaveBeenCalled();
    });

    it('deve lançar NotFoundException se regional não existir', async () => {
      jest.spyOn(prisma.usuario, 'findUnique').mockResolvedValue(null);

      await expect(service.vincularClube(999, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.vincularClube(999, 1)).rejects.toThrow(
        'Usuário com ID 999 não encontrado',
      );
    });

    it('deve lançar ForbiddenException se usuário não for REGIONAL', async () => {
      const usuarioComum = {
        id: 1,
        email: 'user@example.com',
        nome: 'User Test',
        papelGlobal: PapelGlobal.USUARIO,
      };

      jest.spyOn(prisma.usuario, 'findUnique').mockResolvedValue(usuarioComum as any);

      await expect(service.vincularClube(1, 1)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.vincularClube(1, 1)).rejects.toThrow(
        'Apenas usuários com papel REGIONAL podem supervisionar clubes',
      );
    });

    it('deve lançar NotFoundException se clube não existir', async () => {
      const mockRegional = {
        id: 1,
        email: 'regional@example.com',
        nome: 'Regional Test',
        papelGlobal: PapelGlobal.REGIONAL,
      };

      jest.spyOn(prisma.usuario, 'findUnique').mockResolvedValue(mockRegional as any);
      jest.spyOn(prisma.clube, 'findUnique').mockResolvedValue(null);

      await expect(service.vincularClube(1, 999)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.vincularClube(1, 999)).rejects.toThrow(
        'Clube com ID 999 não encontrado',
      );
    });

    it('deve lançar ConflictException se vínculo já existir', async () => {
      const mockRegional = {
        id: 1,
        email: 'regional@example.com',
        nome: 'Regional Test',
        papelGlobal: PapelGlobal.REGIONAL,
      };

      const mockClube = {
        id: 2,
        nome: 'Clube Test',
      };

      const prismaError = new Error('Unique constraint failed') as any;
      prismaError.code = 'P2002';

      jest.spyOn(prisma.usuario, 'findUnique').mockResolvedValue(mockRegional as any);
      jest.spyOn(prisma.clube, 'findUnique').mockResolvedValue(mockClube as any);
      jest.spyOn(prisma.regionalClube, 'create').mockRejectedValue(prismaError);

      await expect(service.vincularClube(1, 2)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.vincularClube(1, 2)).rejects.toThrow(
        'Este regional já supervisiona este clube',
      );
    });
  });

  describe('desvincularClube', () => {
    it('deve desvincular clube de um regional com sucesso', async () => {
      const vinculo = {
        id: 1,
        regionalId: 1,
        clubeId: 2,
        regional: {
          nome: 'Regional Test',
        },
        clube: {
          nome: 'Clube Test',
        },
      };

      jest.spyOn(prisma.regionalClube, 'findUnique').mockResolvedValue(vinculo as any);
      jest.spyOn(prisma.regionalClube, 'delete').mockResolvedValue(vinculo as any);

      const result = await service.desvincularClube(1, 2);

      expect(result).toEqual({ message: 'Clube desvinculado com sucesso' });
      expect(prisma.regionalClube.delete).toHaveBeenCalledWith({
        where: {
          regionalId_clubeId: {
            regionalId: 1,
            clubeId: 2,
          },
        },
      });
    });

    it('deve lançar NotFoundException se vínculo não existir', async () => {
      jest.spyOn(prisma.regionalClube, 'findUnique').mockResolvedValue(null);

      await expect(service.desvincularClube(1, 2)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.desvincularClube(1, 2)).rejects.toThrow(
        'Vínculo entre regional e clube não encontrado',
      );
    });
  });

  describe('listarClubesDoRegional', () => {
    it('deve listar clubes de um regional', async () => {
      const mockRegional = {
        id: 1,
        nome: 'Regional Test',
        regionaisClubes: [
          {
            clube: {
              id: 1,
              nome: 'Clube 1',
              slug: 'clube-1',
              cidade: 'São Paulo',
              estado: 'SP',
              pais: 'Brasil',
              latitude: -23.5505,
              longitude: -46.6333,
              criadoEm: new Date(),
            },
          },
          {
            clube: {
              id: 2,
              nome: 'Clube 2',
              slug: 'clube-2',
              cidade: 'Rio de Janeiro',
              estado: 'RJ',
              pais: 'Brasil',
              latitude: -22.9068,
              longitude: -43.1729,
              criadoEm: new Date(),
            },
          },
        ],
      };

      jest.spyOn(prisma.usuario, 'findUnique').mockResolvedValue(mockRegional as any);

      const result = await service.listarClubesDoRegional(1);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(mockRegional.regionaisClubes[0].clube);
      expect(result[1]).toEqual(mockRegional.regionaisClubes[1].clube);
    });

    it('deve lançar NotFoundException se regional não existir', async () => {
      jest.spyOn(prisma.usuario, 'findUnique').mockResolvedValue(null);

      await expect(service.listarClubesDoRegional(999)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.listarClubesDoRegional(999)).rejects.toThrow(
        'Usuário com ID 999 não encontrado',
      );
    });

    it('deve retornar lista vazia se regional não tiver clubes vinculados', async () => {
      const mockRegional = {
        id: 1,
        nome: 'Regional Test',
        regionaisClubes: [],
      };

      jest.spyOn(prisma.usuario, 'findUnique').mockResolvedValue(mockRegional as any);

      const result = await service.listarClubesDoRegional(1);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('listarRegionaisDoClube', () => {
    it('deve listar regionais de um clube', async () => {
      const mockClube = {
        id: 1,
        nome: 'Clube Test',
        regionais: [
          {
            regional: {
              id: 1,
              nome: 'Regional 1',
              email: 'regional1@example.com',
              fotoPerfilUrl: null,
            },
          },
          {
            regional: {
              id: 2,
              nome: 'Regional 2',
              email: 'regional2@example.com',
              fotoPerfilUrl: null,
            },
          },
        ],
      };

      jest.spyOn(prisma.clube, 'findUnique').mockResolvedValue(mockClube as any);

      const result = await service.listarRegionaisDoClube(1);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(mockClube.regionais[0].regional);
      expect(result[1]).toEqual(mockClube.regionais[1].regional);
    });

    it('deve lançar NotFoundException se clube não existir', async () => {
      jest.spyOn(prisma.clube, 'findUnique').mockResolvedValue(null);

      await expect(service.listarRegionaisDoClube(999)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.listarRegionaisDoClube(999)).rejects.toThrow(
        'Clube com ID 999 não encontrado',
      );
    });
  });

  describe('verificarPermissaoRegional', () => {
    it('deve retornar true se regional supervisiona o clube', async () => {
      const vinculo = {
        id: 1,
        regionalId: 1,
        clubeId: 2,
      };

      jest.spyOn(prisma.regionalClube, 'findUnique').mockResolvedValue(vinculo as any);

      const result = await service.verificarPermissaoRegional(1, 2);

      expect(result).toBe(true);
    });

    it('deve retornar false se regional não supervisiona o clube', async () => {
      jest.spyOn(prisma.regionalClube, 'findUnique').mockResolvedValue(null);

      const result = await service.verificarPermissaoRegional(1, 2);

      expect(result).toBe(false);
    });
  });
});
