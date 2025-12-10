import { Injectable, Logger } from '@nestjs/common';

export interface AuditLogEntry {
  timestamp: Date;
  userId: number;
  action: string;
  entity: string;
  entityId: number | string;
  details?: any;
  ipAddress?: string;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  /**
   * Registra uma ação administrativa no log
   */
  log(entry: AuditLogEntry): void {
    const logMessage = `[AUDIT] ${entry.action} on ${entry.entity}:${entry.entityId} by User:${entry.userId}`;

    this.logger.log({
      ...entry,
      timestamp: entry.timestamp || new Date(),
    });

    // Em produção, isso deve ser salvo no banco de dados
    // Por enquanto, apenas logamos no console
    console.log(logMessage, entry.details || '');
  }

  /**
   * Registra criação de recurso
   */
  logCreate(userId: number, entity: string, entityId: number | string, details?: any): void {
    this.log({
      timestamp: new Date(),
      userId,
      action: 'CREATE',
      entity,
      entityId,
      details,
    });
  }

  /**
   * Registra atualização de recurso
   */
  logUpdate(userId: number, entity: string, entityId: number | string, details?: any): void {
    this.log({
      timestamp: new Date(),
      userId,
      action: 'UPDATE',
      entity,
      entityId,
      details,
    });
  }

  /**
   * Registra exclusão de recurso
   */
  logDelete(userId: number, entity: string, entityId: number | string, details?: any): void {
    this.log({
      timestamp: new Date(),
      userId,
      action: 'DELETE',
      entity,
      entityId,
      details,
    });
  }

  /**
   * Registra aprovação (específico para membros)
   */
  logApprove(userId: number, entity: string, entityId: number | string, details?: any): void {
    this.log({
      timestamp: new Date(),
      userId,
      action: 'APPROVE',
      entity,
      entityId,
      details,
    });
  }

  /**
   * Registra rejeição (específico para membros)
   */
  logReject(userId: number, entity: string, entityId: number | string, details?: any): void {
    this.log({
      timestamp: new Date(),
      userId,
      action: 'REJECT',
      entity,
      entityId,
      details,
    });
  }
}
