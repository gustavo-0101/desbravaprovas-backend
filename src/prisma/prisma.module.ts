import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Módulo global do Prisma
 *
 * Fornece o PrismaService como singleton para toda a aplicação.
 * Marcado como @Global() para evitar reimportação em cada módulo.
 *
 * @module PrismaModule
 *
 * @example
 * // Importar no AppModule
 * @Module({
 *   imports: [PrismaModule],
 * })
 * export class AppModule {}
 *
 * @example
 * // Usar em qualquer service (sem reimportar o módulo)
 * @Injectable()
 * export class UsuariosService {
 *   constructor(private prisma: PrismaService) {}
 * }
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
