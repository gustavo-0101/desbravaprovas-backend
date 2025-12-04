# Guia de Desenvolvimento - Backend Desbrava Provas

## 🚀 Setup Inicial

### Pré-requisitos

- **Node.js**: v22+ ([Download](https://nodejs.org/))
- **PostgreSQL**: v15+ ou Docker
- **Git**: Para controle de versão
- **npm**: Vem com Node.js

### 1. Clonar o Repositório

```bash
git clone <url-do-repositorio>
cd backend-desbravaprovas
```

### 2. Instalar Dependências

```bash
npm install
```

### 3. Configurar Banco de Dados

#### Opção A: PostgreSQL com Docker (Recomendado)

```bash
docker run --name postgres-provas \
  -e POSTGRES_USER=provas \
  -e POSTGRES_PASSWORD=provas123 \
  -e POSTGRES_DB=provas \
  -p 5432:5432 \
  -d postgres:15-alpine
```

#### Opção B: PostgreSQL Local

Instale PostgreSQL e crie o banco:

```sql
CREATE DATABASE provas;
CREATE USER provas WITH PASSWORD 'provas123';
GRANT ALL PRIVILEGES ON DATABASE provas TO provas;
```

### 4. Configurar Variáveis de Ambiente

Crie o arquivo `.env` na raiz:

```env
# Database
DATABASE_URL="postgresql://provas:provas123@localhost:5432/provas?schema=public"
PRISMA_CLIENT_ENGINE_TYPE=library

# JWT (gerar secret: openssl rand -base64 32)
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# IA Provider (escolher um)
OPENAI_API_KEY=sk-...
# ou
ANTHROPIC_API_KEY=sk-ant-...

# OCR (opcional)
GOOGLE_VISION_API_KEY=...

# App
PORT=3000
NODE_ENV=development
```

### 5. Executar Migrations

```bash
npx prisma migrate dev
```

### 6. Gerar Prisma Client

```bash
npx prisma generate
```

### 7. Iniciar Aplicação

```bash
npm run start:dev
```

Acesse:
- API: http://localhost:3000
- Swagger Docs: http://localhost:3000/api-docs

---

## 🛠️ Comandos Úteis

### Desenvolvimento

```bash
# Iniciar em modo watch
npm run start:dev

# Iniciar em modo debug
npm run start:debug

# Build do projeto
npm run build

# Iniciar versão de produção
npm run start:prod
```

### Prisma

```bash
# Criar nova migration
npx prisma migrate dev --name descricao_da_mudanca

# Aplicar migrations
npx prisma migrate deploy

# Resetar banco (CUIDADO: apaga tudo)
npx prisma migrate reset

# Gerar Prisma Client
npx prisma generate

# Abrir Prisma Studio (GUI)
npx prisma studio

# Formatar schema.prisma
npx prisma format
```

### Testes

```bash
# Rodar todos os testes
npm run test

# Testes em modo watch
npm run test:watch

# Testes com coverage
npm run test:cov

# Testes E2E
npm run test:e2e

# Testes em modo debug
npm run test:debug
```

### Linting & Formatação

```bash
# Lint com ESLint
npm run lint

# Format com Prettier
npm run format
```

### Documentação

```bash
# Gerar documentação com Compodoc
npm run docs:generate

# Servir documentação localmente
npm run docs:serve
```

---

## 📁 Estrutura de Módulos

### Criar um Novo Módulo

Use o NestJS CLI para gerar estrutura completa:

```bash
# Gerar módulo completo (resource)
nest g resource nome-do-modulo

# Gerar apenas módulo
nest g module nome-do-modulo

# Gerar service
nest g service nome-do-modulo

# Gerar controller
nest g controller nome-do-modulo

# Gerar guard
nest g guard common/guards/nome-do-guard
```

### Estrutura Padrão de um Módulo

```
src/nome-do-modulo/
├── nome-do-modulo.module.ts      # Módulo NestJS
├── nome-do-modulo.controller.ts  # Controller (rotas HTTP)
├── nome-do-modulo.service.ts     # Service (lógica de negócio)
├── nome-do-modulo.controller.spec.ts  # Teste do controller
├── nome-do-modulo.service.spec.ts     # Teste do service
├── dto/
│   ├── create-nome.dto.ts        # DTO para criação
│   ├── update-nome.dto.ts        # DTO para atualização
│   └── ...
├── entities/
│   └── nome.entity.ts            # Entity (se não usar Prisma models)
└── guards/                       # Guards específicos (opcional)
    └── ...
```

---

## 📝 Convenções de Código

### Nomenclatura

- **Arquivos**: `kebab-case.ts` (ex: `usuarios.service.ts`)
- **Classes**: `PascalCase` (ex: `UsuariosService`)
- **Funções/Métodos**: `camelCase` (ex: `criarUsuario()`)
- **Constantes**: `UPPER_SNAKE_CASE` (ex: `MAX_FILE_SIZE`)
- **Interfaces**: `PascalCase` com prefixo `I` (ex: `IUser`) ou sem (opcional)

### DTOs (Data Transfer Objects)

Use `class-validator` para validação:

```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUsuarioDto {
  @ApiProperty({ description: 'Nome completo do usuário' })
  @IsString()
  nome: string;

  @ApiProperty({ description: 'Email para login', example: 'usuario@exemplo.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Senha (mínimo 6 caracteres)' })
  @IsString()
  @MinLength(6)
  senha: string;
}
```

### Decorators do Swagger

Sempre documente endpoints:

```typescript
@ApiTags('usuarios')
@Controller('usuarios')
export class UsuariosController {
  @Post()
  @ApiOperation({ summary: 'Criar novo usuário' })
  @ApiResponse({ status: 201, description: 'Usuário criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 409, description: 'Email já cadastrado' })
  async criar(@Body() dto: CreateUsuarioDto) {
    return this.usuariosService.criar(dto);
  }
}
```

### Services

- Um service por módulo
- Métodos públicos para operações de negócio
- Métodos privados para lógica auxiliar
- Sempre injetar dependências no constructor

```typescript
@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  async criar(dto: CreateUsuarioDto) {
    // Validações de negócio
    // Operações no banco
    // Retorno
  }

  async buscarPorEmail(email: string) {
    return this.prisma.usuario.findUnique({ where: { email } });
  }

  private async hashSenha(senha: string): Promise<string> {
    return bcrypt.hash(senha, 10);
  }
}
```

### Controllers

- Apenas roteamento e validação de entrada
- Delegar lógica para services
- Usar decorators do NestJS e Swagger

```typescript
@ApiTags('usuarios')
@Controller('usuarios')
@UseGuards(JwtAuthGuard)  // Proteger rotas
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Buscar usuário por ID' })
  async buscarPorId(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.buscarPorId(id);
  }
}
```

---

## 🧪 Testes

### Teste Unitário (Service)

```typescript
describe('UsuariosService', () => {
  let service: UsuariosService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosService,
        {
          provide: PrismaService,
          useValue: {
            usuario: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<UsuariosService>(UsuariosService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('deve criar um usuário', async () => {
    const dto = { nome: 'Teste', email: 'teste@exemplo.com', senha: '123456' };
    const expected = { id: 1, ...dto, senhaHash: 'hashed' };

    jest.spyOn(prisma.usuario, 'create').mockResolvedValue(expected as any);

    const result = await service.criar(dto);

    expect(result).toEqual(expected);
    expect(prisma.usuario.create).toHaveBeenCalled();
  });
});
```

### Teste E2E (Fluxo Completo)

```typescript
describe('Usuarios (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('POST /usuarios - deve criar um usuário', () => {
    return request(app.getHttpServer())
      .post('/usuarios')
      .send({ nome: 'Teste', email: 'teste@exemplo.com', senha: '123456' })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('id');
        expect(res.body.email).toBe('teste@exemplo.com');
      });
  });
});
```

---

## 🔐 Autenticação & Autorização

### Proteger uma Rota

```typescript
@UseGuards(JwtAuthGuard)
@Get('perfil')
getPerfil(@GetUser() user: Usuario) {
  return user;
}
```

### Verificar Papel (Role)

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(PapelGlobal.MASTER)
@Get('admin')
getAdmin() {
  return 'Apenas MASTER pode acessar';
}
```

### Decorator Customizado

```typescript
// common/decorators/get-user.decorator.ts
export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

---

## 🐛 Debugging

### VSCode Launch Configuration

Crie `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug NestJS",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "start:debug"],
      "console": "integratedTerminal",
      "restart": true,
      "protocol": "inspector",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

### Logs

Use o logger nativo do NestJS:

```typescript
import { Logger } from '@nestjs/common';

export class UsuariosService {
  private readonly logger = new Logger(UsuariosService.name);

  async criar(dto: CreateUsuarioDto) {
    this.logger.log(`Criando usuário: ${dto.email}`);
    // ...
  }
}
```

---

## 🚨 Tratamento de Erros

### Lançar Exceções

```typescript
import { NotFoundException, ConflictException } from '@nestjs/common';

async buscarPorId(id: number) {
  const usuario = await this.prisma.usuario.findUnique({ where: { id } });

  if (!usuario) {
    throw new NotFoundException(`Usuário com ID ${id} não encontrado`);
  }

  return usuario;
}

async criar(dto: CreateUsuarioDto) {
  const existe = await this.buscarPorEmail(dto.email);

  if (existe) {
    throw new ConflictException('Email já cadastrado');
  }

  // ...
}
```

### Exception Filter Global

```typescript
// common/filters/http-exception.filter.ts
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: exception instanceof Error ? exception.message : 'Erro interno',
    });
  }
}
```

---

## 📦 Dependências Importantes

### Produção

```json
{
  "@nestjs/common": "^11.0.1",
  "@nestjs/core": "^11.0.1",
  "@nestjs/platform-express": "^11.0.1",
  "@nestjs/swagger": "^8.0.0",
  "@prisma/client": "^7.1.0",
  "bcrypt": "^6.0.0",
  "class-validator": "^0.14.0",
  "class-transformer": "^0.5.1",
  "@nestjs/jwt": "^10.0.0",
  "@nestjs/passport": "^10.0.0",
  "passport": "^0.6.0",
  "passport-jwt": "^4.0.0"
}
```

### Desenvolvimento

```json
{
  "@nestjs/cli": "^11.0.0",
  "@nestjs/testing": "^11.0.1",
  "prisma": "^7.1.0",
  "@compodoc/compodoc": "^1.1.0",
  "jest": "^30.0.0",
  "supertest": "^7.0.0",
  "ts-jest": "^29.2.5",
  "eslint": "^9.18.0",
  "prettier": "^3.4.2"
}
```

---

## 🌳 Git Workflow

### Branches

- `master`: Branch principal (produção)
- `develop`: Branch de desenvolvimento
- `feature/nome-da-feature`: Features em desenvolvimento
- `bugfix/descricao-do-bug`: Correções de bugs

### Commits

Siga o padrão Conventional Commits:

```bash
# Feature
git commit -m "feat: adiciona módulo de autenticação"

# Bugfix
git commit -m "fix: corrige validação de email"

# Documentação
git commit -m "docs: atualiza README com setup"

# Refactor
git commit -m "refactor: melhora performance do service de provas"

# Teste
git commit -m "test: adiciona testes para UsuariosService"

# Chore (configuração, deps, etc)
git commit -m "chore: atualiza dependências do projeto"
```

### Pull Requests

1. Criar branch a partir de `develop`
2. Implementar feature com testes
3. Atualizar documentação se necessário
4. Abrir PR para `develop`
5. Aguardar code review
6. Merge após aprovação

---

## 🔍 Code Review Checklist

- [ ] Código segue convenções do projeto
- [ ] Testes unitários criados e passando
- [ ] Testes E2E para fluxos críticos
- [ ] Swagger documentado (decorators)
- [ ] JSDoc em métodos públicos
- [ ] Tratamento de erros adequado
- [ ] Validação de DTOs com class-validator
- [ ] Sem hardcoded secrets (usar .env)
- [ ] Migrations criadas se houver mudanças no schema
- [ ] README ou docs atualizados se necessário

---

## 📚 Recursos & Links Úteis

- [NestJS Docs](https://docs.nestjs.com/)
- [Prisma Docs](https://www.prisma.io/docs/)
- [Swagger/OpenAPI](https://swagger.io/specification/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Jest Docs](https://jestjs.io/docs/getting-started)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)

---

## ❓ Troubleshooting

### Erro: "Cannot find module '@prisma/client'"

```bash
npx prisma generate
```

### Erro: "Port 3000 already in use"

Mude a porta no `.env`:
```env
PORT=3001
```

Ou mate o processo:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

### Migrations não aplicando

```bash
# Forçar reset (CUIDADO: apaga tudo)
npx prisma migrate reset

# Recriar do zero
npx prisma migrate dev
```

### Testes falhando

```bash
# Limpar cache do Jest
npm run test -- --clearCache

# Rodar testes com verbose
npm run test -- --verbose
```

---

## 🎉 Pronto!

Agora você está pronto para desenvolver no projeto Desbrava Provas!

Se encontrar problemas ou tiver dúvidas, consulte a documentação completa em `docs/` ou abra uma issue no repositório.

**Versão**: 0.1.0-beta
**Última atualização**: 2025-12-04
