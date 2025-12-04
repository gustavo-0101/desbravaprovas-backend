# Estratégia de Documentação e Testes - Backend Desbrava Provas

## 📚 Estratégia de Documentação

### 1. Swagger/OpenAPI (@nestjs/swagger)
**Propósito**: Documentar automaticamente os endpoints da API

**Funcionalidades**:
- Interface interativa para testar requisições
- Gera especificações OpenAPI que podem ser importadas em ferramentas
- Decorators para documentar DTOs, responses, parâmetros
- Acesso via `/api-docs` (ou rota customizada)

**Vantagem**: Claude pode consultar os endpoints, DTOs e schemas através da URL ou JSON exportado

### 2. Compodoc
**Propósito**: Documentar a estrutura do código (módulos, services, controllers)

**Funcionalidades**:
- Gera site estático com arquitetura visualizada
- Mostra dependências entre módulos
- Extrai JSDoc/TSDoc dos arquivos
- Gráficos de relacionamento

**Vantagem**: Claude pode entender a arquitetura completa do projeto navegando pela documentação gerada

### 3. Documentação em Markdown (pasta `docs/`)
**Estrutura proposta**:

```
docs/
├── ARCHITECTURE.md      # Decisões arquiteturais, fluxos principais, padrões
├── API.md              # Exemplos de uso da API, casos especiais, fluxos completos
├── DATABASE.md         # Estrutura do banco, relacionamentos, migrations
├── DEVELOPMENT.md      # Setup inicial, convenções de código, workflows Git
├── DEPLOYMENT.md       # Como fazer deploy, variáveis de ambiente
└── FEATURES.md         # Documentação de funcionalidades principais
```

**Vantagem**: Claude pode ler esses arquivos diretamente para contexto profundo

### 4. JSDoc/TSDoc nos Arquivos
**Propósito**: Comentários estruturados no código-fonte

**Exemplo**:
```typescript
/**
 * Service responsável pela gestão de provas
 * @class ProvasService
 */
export class ProvasService {
  /**
   * Cria uma nova prova
   * @param {CreateProvaDto} dto - Dados da prova
   * @param {number} userId - ID do usuário criador
   * @returns {Promise<Prova>} Prova criada
   * @throws {ForbiddenException} Se usuário não for conselheiro
   */
  async criar(dto: CreateProvaDto, userId: number): Promise<Prova> {
    // ...
  }
}
```

**Vantagem**: Compodoc usa isso para gerar documentação + Claude pode ler diretamente no código

---

## 🧪 Estratégia de Testes

### Configuração Atual
- **Jest** já configurado no `package.json`
- **Supertest** instalado para testes E2E

### Tipos de Testes a Implementar

#### 1. Testes Unitários
**Escopo**: Services, Guards, Pipes, Validators isolados
**Localização**: `*.spec.ts` ao lado do arquivo testado
**Meta de Coverage**: >80%

**Exemplo**:
```
src/
├── usuarios/
│   ├── usuarios.service.ts
│   └── usuarios.service.spec.ts
```

#### 2. Testes de Integração
**Escopo**: Controllers com dependências mockadas
**Localização**: `*.spec.ts` nos controllers
**Foco**: Validações, DTOs, Guards, responses HTTP

#### 3. Testes E2E (End-to-End)
**Escopo**: Fluxos completos da aplicação
**Localização**: `test/*.e2e-spec.ts`
**Foco**: Cenários reais, integração com banco (test database)

**Exemplo de fluxos**:
- Cadastro → Aprovação → Login → Criar Prova
- Gerar questões por IA → Responder prova → Correção automática

#### 4. Coverage Reports
**Comando**: `npm run test:cov`
**Saída**: `coverage/lcov-report/index.html`
**Meta**: >80% de cobertura de linhas

### Scripts de Teste (package.json)
```json
{
  "test": "jest",
  "test:watch": "jest --watch",
  "test:cov": "jest --coverage",
  "test:e2e": "jest --config ./test/jest-e2e.json",
  "test:debug": "node --inspect-brk ... jest --runInBand"
}
```

---

## 🚀 Implementação da Estratégia

### Fase 1: Setup Inicial
1. Instalar dependências:
   - `@nestjs/swagger swagger-ui-express`
   - `@compodoc/compodoc` (devDependency)

2. Configurar Swagger no `main.ts`
3. Adicionar scripts no `package.json`:
   - `"docs:api": "compodoc -p tsconfig.json -s"`
   - `"docs:serve": "compodoc -p tsconfig.json -s"`

4. Criar estrutura de pastas `docs/`

### Fase 2: Documentação Contínua
- Sempre adicionar decorators do Swagger ao criar endpoints
- Sempre criar testes ao criar novos services/controllers
- Atualizar markdown quando houver mudanças arquiteturais

### Fase 3: Templates de Teste
Criar templates para facilitar criação de novos testes:
- `test/templates/unit.template.spec.ts`
- `test/templates/e2e.template.spec.ts`

---

## 📖 Como Claude Vai Usar Essa Documentação

### Contexto Inicial
1. Ler `ARCHITECTURE.md` para entender decisões
2. Consultar `DATABASE.md` para entender schema
3. Ver `DEVELOPMENT.md` para padrões de código

### Durante Desenvolvimento
1. Consultar Swagger JSON para ver endpoints existentes
2. Ler JSDoc/TSDoc nos arquivos relevantes
3. Verificar testes existentes antes de criar novos

### Para Novas Features
1. Atualizar `FEATURES.md` com descrição
2. Documentar no Swagger
3. Adicionar JSDoc completo
4. Criar testes unitários e E2E

---

## ✅ Checklist de Implementação

- [ ] Instalar @nestjs/swagger e swagger-ui-express
- [ ] Instalar @compodoc/compodoc
- [ ] Configurar Swagger no main.ts
- [ ] Criar pasta docs/ com arquivos base
- [ ] Adicionar scripts de documentação no package.json
- [ ] Criar templates de testes
- [ ] Configurar coverage reports
- [ ] Documentar schema Prisma no DATABASE.md
- [ ] Escrever decisões arquiteturais no ARCHITECTURE.md
- [ ] Criar guia de desenvolvimento no DEVELOPMENT.md

---

**Data de Criação**: 2025-12-04
**Status**: Planejado - Aguardando Implementação
