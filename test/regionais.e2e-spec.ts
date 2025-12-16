import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PapelGlobal } from '@prisma/client';
import * as bcrypt from 'bcrypt';

/**
 * Testes E2E do Módulo Regionais
 *
 * Testa:
 * - Vincular/Desvincular clubes a regionais (MASTER only)
 * - Listar clubes supervisionados
 * - Permissões de REGIONAL para visualizar/editar provas
 */
describe('Regionais (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let masterToken: string;
  let regionalToken: string;
  let usuarioToken: string;
  let masterId: number;
  let regionalId: number;
  let clubeId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    prisma = app.get<PrismaService>(PrismaService);

    await app.init();

    // Setup: criar usuários e clube de teste
    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
    await app.close();
  });

  /**
   * Setup: Criar usuários de teste (MASTER, REGIONAL, USUARIO) e clube
   */
  async function setupTestData() {
    const senhaHash = await bcrypt.hash('senha123', 10);

    const master = await prisma.usuario.create({
      data: {
        nome: 'Master Test',
        email: 'master@regionais-test.com',
        senhaHash,
        papelGlobal: PapelGlobal.MASTER,
      },
    });
    masterId = master.id;

    const regional = await prisma.usuario.create({
      data: {
        nome: 'Regional Test',
        email: 'regional@regionais-test.com',
        senhaHash,
        papelGlobal: PapelGlobal.REGIONAL,
      },
    });
    regionalId = regional.id;

    await prisma.usuario.create({
      data: {
        nome: 'Usuario Test',
        email: 'usuario@regionais-test.com',
        senhaHash,
        papelGlobal: PapelGlobal.USUARIO,
      },
    });

    const clube = await prisma.clube.create({
      data: {
        nome: 'Clube Regional Test',
        slug: 'clube-regional-test',
        cidade: 'São Paulo',
        estado: 'SP',
        pais: 'Brasil',
      },
    });
    clubeId = clube.id;

    const masterLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'master@regionais-test.com', senha: 'senha123' });
    masterToken = masterLogin.body.access_token;

    const regionalLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'regional@regionais-test.com', senha: 'senha123' });
    regionalToken = regionalLogin.body.access_token;

    const usuarioLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'usuario@regionais-test.com', senha: 'senha123' });
    usuarioToken = usuarioLogin.body.access_token;
  }

  /**
   * Cleanup: Remover dados de teste
   */
  async function cleanupTestData() {
    await prisma.regionalClube.deleteMany({
      where: {
        OR: [
          { regionalId },
          { clubeId },
        ],
      },
    });

    await prisma.clube.deleteMany({
      where: {
        slug: {
          contains: 'regional-test',
        },
      },
    });

    await prisma.usuario.deleteMany({
      where: {
        email: {
          contains: 'regionais-test.com',
        },
      },
    });
  }

  describe('POST /regionais/:regionalId/clubes', () => {
    it('MASTER deve vincular clube a regional', () => {
      return request(app.getHttpServer())
        .post(`/regionais/${regionalId}/clubes`)
        .set('Authorization', `Bearer ${masterToken}`)
        .send({ clubeId })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.regionalId).toBe(regionalId);
          expect(res.body.clubeId).toBe(clubeId);
          expect(res.body.clube).toHaveProperty('nome');
          expect(res.body.regional).toHaveProperty('nome');
        });
    });

    it('deve retornar 409 se vínculo já existe', async () => {
      await prisma.regionalClube.upsert({
        where: {
          regionalId_clubeId: {
            regionalId,
            clubeId,
          },
        },
        create: {
          regionalId,
          clubeId,
        },
        update: {},
      });

      return request(app.getHttpServer())
        .post(`/regionais/${regionalId}/clubes`)
        .set('Authorization', `Bearer ${masterToken}`)
        .send({ clubeId })
        .expect(409);
    });

    it('deve retornar 403 se não for MASTER', () => {
      return request(app.getHttpServer())
        .post(`/regionais/${regionalId}/clubes`)
        .set('Authorization', `Bearer ${usuarioToken}`)
        .send({ clubeId })
        .expect(403);
    });

    it('deve retornar 404 se regional não existir', () => {
      return request(app.getHttpServer())
        .post('/regionais/99999/clubes')
        .set('Authorization', `Bearer ${masterToken}`)
        .send({ clubeId })
        .expect(404);
    });

    it('deve retornar 404 se clube não existir', () => {
      return request(app.getHttpServer())
        .post(`/regionais/${regionalId}/clubes`)
        .set('Authorization', `Bearer ${masterToken}`)
        .send({ clubeId: 99999 })
        .expect(404);
    });
  });

  describe('DELETE /regionais/:regionalId/clubes/:clubeId', () => {
    beforeEach(async () => {
      await prisma.regionalClube.upsert({
        where: {
          regionalId_clubeId: {
            regionalId,
            clubeId,
          },
        },
        create: {
          regionalId,
          clubeId,
        },
        update: {},
      });
    });

    it('MASTER deve desvincular clube de regional', () => {
      return request(app.getHttpServer())
        .delete(`/regionais/${regionalId}/clubes/${clubeId}`)
        .set('Authorization', `Bearer ${masterToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toBe('Clube desvinculado com sucesso');
        });
    });

    it('deve retornar 403 se não for MASTER', async () => {
      return request(app.getHttpServer())
        .delete(`/regionais/${regionalId}/clubes/${clubeId}`)
        .set('Authorization', `Bearer ${usuarioToken}`)
        .expect(403);
    });

    it('deve retornar 404 se vínculo não existir', async () => {
      await prisma.regionalClube.deleteMany({
        where: {
          regionalId,
          clubeId,
        },
      });

      return request(app.getHttpServer())
        .delete(`/regionais/${regionalId}/clubes/${clubeId}`)
        .set('Authorization', `Bearer ${masterToken}`)
        .expect(404);
    });
  });

  describe('GET /regionais/:regionalId/clubes', () => {
    beforeEach(async () => {
      await prisma.regionalClube.upsert({
        where: {
          regionalId_clubeId: {
            regionalId,
            clubeId,
          },
        },
        create: {
          regionalId,
          clubeId,
        },
        update: {},
      });
    });

    it('deve listar clubes supervisionados por um regional', () => {
      return request(app.getHttpServer())
        .get(`/regionais/${regionalId}/clubes`)
        .set('Authorization', `Bearer ${masterToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0]).toHaveProperty('id');
          expect(res.body[0]).toHaveProperty('nome');
          expect(res.body[0]).toHaveProperty('slug');
        });
    });

    it('deve retornar 404 se regional não existir', () => {
      return request(app.getHttpServer())
        .get('/regionais/99999/clubes')
        .set('Authorization', `Bearer ${masterToken}`)
        .expect(404);
    });

    it('deve retornar lista vazia se regional não tiver clubes vinculados', async () => {
      const novoRegional = await prisma.usuario.create({
        data: {
          nome: 'Regional Vazio',
          email: 'regionalvazio@regionais-test.com',
          senhaHash: await bcrypt.hash('senha123', 10),
          papelGlobal: PapelGlobal.REGIONAL,
        },
      });

      return request(app.getHttpServer())
        .get(`/regionais/${novoRegional.id}/clubes`)
        .set('Authorization', `Bearer ${masterToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(0);
        });
    });
  });

  describe('GET /regionais/meus-clubes', () => {
    beforeEach(async () => {
      await prisma.regionalClube.upsert({
        where: {
          regionalId_clubeId: {
            regionalId,
            clubeId,
          },
        },
        create: {
          regionalId,
          clubeId,
        },
        update: {},
      });
    });

    it('REGIONAL deve listar seus próprios clubes', () => {
      return request(app.getHttpServer())
        .get('/regionais/meus-clubes')
        .set('Authorization', `Bearer ${regionalToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0]).toHaveProperty('id');
          expect(res.body[0]).toHaveProperty('nome');
        });
    });

    it('deve retornar 403 se não for REGIONAL', () => {
      return request(app.getHttpServer())
        .get('/regionais/meus-clubes')
        .set('Authorization', `Bearer ${usuarioToken}`)
        .expect(403);
    });
  });

  /**
   * Fluxo Completo: Vincular → Listar → Desvincular
   */
  describe('Fluxo Completo: Gerenciar Supervisão Regional', () => {
    it('deve executar fluxo completo de supervisão', async () => {
      await prisma.regionalClube.deleteMany({
        where: { regionalId, clubeId },
      });

      const vincularRes = await request(app.getHttpServer())
        .post(`/regionais/${regionalId}/clubes`)
        .set('Authorization', `Bearer ${masterToken}`)
        .send({ clubeId })
        .expect(201);

      expect(vincularRes.body.regionalId).toBe(regionalId);
      expect(vincularRes.body.clubeId).toBe(clubeId);

      const listarRes = await request(app.getHttpServer())
        .get(`/regionais/${regionalId}/clubes`)
        .set('Authorization', `Bearer ${masterToken}`)
        .expect(200);

      expect(listarRes.body.some((c: any) => c.id === clubeId)).toBe(true);

      const meusClubesRes = await request(app.getHttpServer())
        .get('/regionais/meus-clubes')
        .set('Authorization', `Bearer ${regionalToken}`)
        .expect(200);

      expect(meusClubesRes.body.some((c: any) => c.id === clubeId)).toBe(true);

      await request(app.getHttpServer())
        .delete(`/regionais/${regionalId}/clubes/${clubeId}`)
        .set('Authorization', `Bearer ${masterToken}`)
        .expect(200);

      const listarAposRes = await request(app.getHttpServer())
        .get(`/regionais/${regionalId}/clubes`)
        .set('Authorization', `Bearer ${masterToken}`)
        .expect(200);

      expect(listarAposRes.body.some((c: any) => c.id === clubeId)).toBe(false);
    });
  });
});
