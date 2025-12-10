import { Module, Global } from '@nestjs/common';
import { AuditLogService } from './services/audit-log.service';

@Global()
@Module({
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class CommonModule {}
