import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/**
 * Serviço do Prisma ORM
 *
 * Gerencia a conexão com o banco de dados PostgreSQL através do Prisma Client.
 * Implementa lifecycle hooks para conectar/desconectar automaticamente.
 *
 * @class PrismaService
 * @extends {PrismaClient}
 * @implements {OnModuleInit}
 * @implements {OnModuleDestroy}
 *
 * @example
 * // Injetar no service
 * constructor(private prisma: PrismaService) {}
 *
 * // Usar para queries
 * const usuarios = await this.prisma.usuario.findMany();
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  /**
   * Construtor do PrismaService
   *
   * Inicializa o PrismaClient com driver adapter do PostgreSQL.
   * Necessário no Prisma 7 para usar o query compiler (client engine).
   *
   * Log level baseado no ambiente (development vs production).
   */
  constructor() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL não está definida no .env');
    }

    // Criar pool de conexões do PostgreSQL
    const pool = new Pool({ connectionString });

    // Criar adapter do Prisma para PostgreSQL
    const adapter = new PrismaPg(pool);

    // Inicializar PrismaClient com o adapter
    super({
      adapter,
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['warn', 'error'],
    });
  }

  /**
   * Hook executado quando o módulo é inicializado
   *
   * Conecta ao banco de dados PostgreSQL.
   * Caso a conexão falhe, a aplicação não inicia.
   *
   * @returns {Promise<void>}
   * @throws {Error} Se não conseguir conectar ao banco
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Conectado ao banco de dados PostgreSQL');
    } catch (error) {
      this.logger.error('Falha ao conectar ao banco de dados', error);
      throw error;
    }
  }

  /**
   * Hook executado quando o módulo é destruído
   *
   * Desconecta do banco de dados de forma graceful.
   * Importante para evitar conexões pendentes.
   *
   * @returns {Promise<void>}
   */
  async onModuleDestroy(): Promise<void> {
    try {
      await this.$disconnect();
      this.logger.log('Desconectado do banco de dados PostgreSQL');
    } catch (error) {
      this.logger.error('Erro ao desconectar do banco de dados', error);
    }
  }

  /**
   * Limpa todos os dados do banco (USE COM CUIDADO!)
   *
   * Método auxiliar para testes E2E.
   * NUNCA deve ser usado em produção.
   *
   * @returns {Promise<void>}
   * @throws {Error} Se executado em produção
   *
   * @example
   * // Em testes E2E
   * afterEach(async () => {
   *   await prisma.cleanDatabase();
   * });
   */
  async cleanDatabase(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'cleanDatabase() não pode ser executado em produção!',
      );
    }

    this.logger.warn('Limpando banco de dados...');

    // Delete em ordem reversa das foreign keys
    await this.$transaction([
      this.respostaProva.deleteMany(),
      this.questao.deleteMany(),
      this.prova.deleteMany(),
      this.membroClube.deleteMany(),
      this.unidade.deleteMany(),
      this.clube.deleteMany(),
      this.especialidade.deleteMany(),
      this.usuario.deleteMany(),
    ]);

    this.logger.warn('Banco de dados limpo');
  }

  /**
   * Executa um healthcheck no banco de dados
   *
   * Verifica se a conexão está ativa executando uma query simples.
   * Útil para endpoints de health check.
   *
   * @returns {Promise<boolean>} True se conectado, false caso contrário
   *
   * @example
   * // Em um health controller
   * const dbHealthy = await this.prisma.healthCheck();
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('Health check falhou', error);
      return false;
    }
  }
}
