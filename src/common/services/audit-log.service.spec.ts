import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogService } from './audit-log.service';
import { Logger } from '@nestjs/common';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let loggerSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditLogService],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);

    // Spy on logger.log and console.log
    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('log', () => {
    it('should log an audit entry with logger and console', () => {
      const entry = {
        timestamp: new Date(),
        userId: 1,
        action: 'TEST',
        entity: 'TestEntity',
        entityId: 123,
        details: { foo: 'bar' },
      };

      service.log(entry);

      expect(loggerSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[AUDIT] TEST on TestEntity:123 by User:1',
        entry.details,
      );
    });

    it('should use default timestamp if not provided', () => {
      const entry = {
        timestamp: undefined as any,
        userId: 1,
        action: 'TEST',
        entity: 'TestEntity',
        entityId: 123,
      };

      service.log(entry);

      expect(loggerSpy).toHaveBeenCalled();
    });

    it('should log empty string when no details provided', () => {
      const entry = {
        timestamp: new Date(),
        userId: 1,
        action: 'TEST',
        entity: 'TestEntity',
        entityId: 123,
      };

      service.log(entry);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[AUDIT] TEST on TestEntity:123 by User:1',
        '',
      );
    });
  });

  describe('logCreate', () => {
    it('should log CREATE action', () => {
      service.logCreate(1, 'Clube', 10, { nome: 'Clube Teste' });

      expect(loggerSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[AUDIT] CREATE on Clube:10 by User:1',
        { nome: 'Clube Teste' },
      );
    });

    it('should log CREATE action without details', () => {
      service.logCreate(1, 'Clube', 10);

      expect(loggerSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[AUDIT] CREATE on Clube:10 by User:1',
        '',
      );
    });
  });

  describe('logUpdate', () => {
    it('should log UPDATE action', () => {
      service.logUpdate(1, 'Clube', 10, { nome: 'Clube Atualizado' });

      expect(loggerSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[AUDIT] UPDATE on Clube:10 by User:1',
        { nome: 'Clube Atualizado' },
      );
    });
  });

  describe('logDelete', () => {
    it('should log DELETE action', () => {
      service.logDelete(1, 'Clube', 10, { motivo: 'Inativo' });

      expect(loggerSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[AUDIT] DELETE on Clube:10 by User:1',
        { motivo: 'Inativo' },
      );
    });
  });

  describe('logApprove', () => {
    it('should log APPROVE action', () => {
      service.logApprove(1, 'Membro', 10, { papel: 'CONSELHEIRO' });

      expect(loggerSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[AUDIT] APPROVE on Membro:10 by User:1',
        { papel: 'CONSELHEIRO' },
      );
    });
  });

  describe('logReject', () => {
    it('should log REJECT action', () => {
      service.logReject(1, 'Membro', 10, { motivo: 'Não atende requisitos' });

      expect(loggerSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[AUDIT] REJECT on Membro:10 by User:1',
        { motivo: 'Não atende requisitos' },
      );
    });
  });
});
