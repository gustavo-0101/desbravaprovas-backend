# Database - Backend Desbrava Provas

## 🗄️ Visão Geral

Banco de dados **PostgreSQL 15+** gerenciado por **Prisma ORM**.

**Conexão**: Definida em `.env` via `DATABASE_URL`

```env
DATABASE_URL="postgresql://provas:provas123@localhost:5432/provas?schema=public"
```

---

## 📊 Diagrama ER (Entity Relationship)

```
┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│   Usuario    │◄─────────┤  MembroClube │─────────►│    Clube     │
│              │          │              │          │              │
│ - id         │          │ - id         │          │ - id         │
│ - nome       │          │ - usuarioId  │          │ - nome       │
│ - email      │          │ - clubeId    │          │ - slug       │
│ - senhaHash  │          │ - unidadeId  │◄────┐    └──────────────┘
│ - papelGlobal│          │ - papel      │     │             │
│ - fotoPerfilUrl         │ - status     │     │             │
└──────────────┘          └──────────────┘     │             ▼
       │                                        │    ┌──────────────┐
       │                                        └────┤   Unidade    │
       │                                             │              │
       │                                             │ - id         │
       │                                             │ - clubeId    │
       │                                             │ - nome       │
       │                                             └──────────────┘
       │
       │  criadaPor
       ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    Prova     │────►│   Questao    │     │Especialidade │
│              │     │              │     │              │
│ - id         │     │ - id         │     │ - id         │
│ - titulo     │     │ - provaId    │     │ - nome       │
│ - clubeId    │     │ - tipo       │     │ - descricao  │
│ - unidadeId  │     │ - enunciado  │     └──────────────┘
│ - especialidadeId  │ - alternativas       ▲
│ - criadaPorId      │ - respostaCorreta    │
│ - valorTotal       │ - valor              │
│ - visibilidade     │ - geradaPorIA        │
│ - provaOriginalId  └──────────────┘       │
└──────────────┘                            │
       │                                     │
       │                                     │
       ▼                                     │
┌──────────────┐                            │
│RespostaProva │                            │
│              │                            │
│ - id         │                            │
│ - provaId    │────────────────────────────┘
│ - usuarioId  │
│ - respostas  │ (JSON)
│ - notaObjetiva
│ - notaDissertativa
│ - notaFinal
│ - corrigidaAutomaticamente
│ - precisaCorrecaoManual
└──────────────┘
```

---

## 📋 Modelos (Tabelas)

### Usuario

Representa um usuário da plataforma.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | Int (PK) | ID único do usuário |
| `nome` | String | Nome completo |
| `email` | String (unique) | Email para login |
| `senhaHash` | String | Senha criptografada (bcrypt) |
| `papelGlobal` | PapelGlobal | Papel global (USUARIO, MASTER) |
| `fotoPerfilUrl` | String? | URL da foto de perfil |
| `criadoEm` | DateTime | Data de criação |
| `atualizadoEm` | DateTime | Última atualização |

**Relações**:
- `membrosClube` → MembroClube[] (vínculos com clubes)
- `provasCriadas` → Prova[] (provas que criou)
- `respostas` → RespostaProva[] (provas que respondeu)

**Índices**:
- `email` (unique)

---

### Clube

Representa um clube de desbravadores.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | Int (PK) | ID único do clube |
| `nome` | String | Nome do clube (ex: "Águias da Serra") |
| `slug` | String (unique) | Slug URL-friendly (ex: "aguias-da-serra") |
| `criadoEm` | DateTime | Data de criação |

**Relações**:
- `membros` → MembroClube[] (membros do clube)
- `unidades` → Unidade[] (unidades do clube)
- `provas` → Prova[] (provas do clube)

**Índices**:
- `slug` (unique)

---

### Unidade

Subdivisão dentro de um clube (ex: "Unidade Azul", "Unidade Vermelha").

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | Int (PK) | ID único da unidade |
| `clubeId` | Int (FK) | Clube ao qual pertence |
| `nome` | String | Nome da unidade |
| `criadoEm` | DateTime | Data de criação |

**Relações**:
- `clube` → Clube (clube pai)
- `membros` → MembroClube[] (membros da unidade)
- `provas` → Prova[] (provas específicas da unidade)

**Foreign Keys**:
- `clubeId` → Clube.id

---

### MembroClube

Vínculo entre um usuário e um clube (com papel e status).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | Int (PK) | ID único do vínculo |
| `usuarioId` | Int (FK) | Usuário vinculado |
| `clubeId` | Int (FK) | Clube vinculado |
| `unidadeId` | Int? (FK) | Unidade (se CONSELHEIRO/DESBRAVADOR) |
| `papel` | PapelClube | ADMIN_CLUBE, DIRETORIA, CONSELHEIRO, DESBRAVADOR |
| `status` | StatusMembro | PENDENTE, ATIVO, BLOQUEADO |
| `criadoEm` | DateTime | Data de criação |

**Relações**:
- `usuario` → Usuario
- `clube` → Clube
- `unidade` → Unidade? (opcional)

**Foreign Keys**:
- `usuarioId` → Usuario.id
- `clubeId` → Clube.id
- `unidadeId` → Unidade.id (nullable)

**Constraints**:
- `@@unique([usuarioId, clubeId])` - Um usuário só pode ter um vínculo por clube

**Regras**:
- Se `papel = CONSELHEIRO` ou `DESBRAVADOR`: `unidadeId` é obrigatório
- Se `papel = DIRETORIA` ou `ADMIN_CLUBE`: `unidadeId` deve ser null

---

### Especialidade

Área de conhecimento de provas (ex: "Primeiros Socorros", "Nós e Amarras").

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | Int (PK) | ID único da especialidade |
| `nome` | String | Nome da especialidade |
| `descricao` | String? | Descrição detalhada |

**Relações**:
- `provas` → Prova[] (provas sobre esta especialidade)

---

### Prova

Representa uma prova/avaliação.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | Int (PK) | ID único da prova |
| `titulo` | String | Título da prova |
| `clubeId` | Int (FK) | Clube da prova |
| `unidadeId` | Int? (FK) | Unidade (se visibilidade UNIDADE) |
| `especialidadeId` | Int? (FK) | Especialidade relacionada |
| `criadaPorId` | Int (FK) | Usuário que criou |
| `valorTotal` | Int | Pontuação total (padrão: 100) |
| `visibilidade` | VisibilidadeProva | PRIVADA, UNIDADE, CLUBE, PUBLICA |
| `criadoEm` | DateTime | Data de criação |
| `atualizadoEm` | DateTime | Última atualização |
| `provaOriginalId` | Int? (FK) | ID da prova original (se clonada) |

**Relações**:
- `clube` → Clube
- `unidade` → Unidade? (opcional)
- `especialidade` → Especialidade? (opcional)
- `criadaPor` → Usuario
- `questoes` → Questao[] (questões da prova)
- `respostas` → RespostaProva[] (respostas enviadas)
- `provaOriginal` → Prova? (prova de origem se clonada)
- `clones` → Prova[] (provas clonadas desta)

**Foreign Keys**:
- `clubeId` → Clube.id
- `unidadeId` → Unidade.id (nullable)
- `especialidadeId` → Especialidade.id (nullable)
- `criadaPorId` → Usuario.id
- `provaOriginalId` → Prova.id (self-reference, nullable)

**Regras**:
- Se `visibilidade = UNIDADE`: `unidadeId` é obrigatório

---

### Questao

Questão individual dentro de uma prova.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | Int (PK) | ID único da questão |
| `provaId` | Int (FK) | Prova à qual pertence |
| `tipo` | TipoQuestao | MULTIPLA_ESCOLHA, DISSERTATIVA |
| `enunciado` | String | Texto da questão |
| `alternativas` | Json? | Alternativas (se múltipla escolha) |
| `respostaCorreta` | String? | Gabarito (ex: "A", "B", "C") |
| `valor` | Int | Pontos da questão (padrão: 10) |
| `geradaPorIA` | Boolean | Se foi gerada automaticamente |

**Relações**:
- `prova` → Prova

**Foreign Keys**:
- `provaId` → Prova.id

**Formato de `alternativas` (JSON)**:
```json
{
  "A": "Primeira alternativa",
  "B": "Segunda alternativa",
  "C": "Terceira alternativa",
  "D": "Quarta alternativa",
  "E": "Quinta alternativa"
}
```

**Regras**:
- Se `tipo = MULTIPLA_ESCOLHA`:
  - `alternativas` e `respostaCorreta` são obrigatórios
- Se `tipo = DISSERTATIVA`:
  - `alternativas` e `respostaCorreta` devem ser null

---

### RespostaProva

Resposta de um desbravador a uma prova.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | Int (PK) | ID único da resposta |
| `provaId` | Int (FK) | Prova respondida |
| `usuarioId` | Int (FK) | Desbravador que respondeu |
| `respostas` | Json | Respostas dadas (ver formato abaixo) |
| `notaObjetiva` | Float? | Nota das questões de múltipla escolha |
| `notaDissertativa` | Float? | Nota das questões dissertativas |
| `notaFinal` | Float? | Nota total (objetiva + dissertativa) |
| `corrigidaAutomaticamente` | Boolean | Se foi corrigida automaticamente |
| `precisaCorrecaoManual` | Boolean | Se possui questões dissertativas |
| `criadoEm` | DateTime | Data de envio |

**Relações**:
- `prova` → Prova
- `usuario` → Usuario

**Foreign Keys**:
- `provaId` → Prova.id
- `usuarioId` → Usuario.id

**Formato de `respostas` (JSON)**:
```json
{
  "1": "A",           // Questão 1: alternativa A
  "2": "C",           // Questão 2: alternativa C
  "3": "Resposta dissertativa aqui..."
}
```

**Regras**:
- Um usuário só pode responder uma vez cada prova (único por `provaId + usuarioId`)
- `corrigidaAutomaticamente = true` apenas se todas as questões forem múltipla escolha
- `precisaCorrecaoManual = true` se houver pelo menos uma questão dissertativa

---

## 🔑 Enums

### PapelGlobal

Papel global do usuário na plataforma.

```prisma
enum PapelGlobal {
  USUARIO   // Padrão - precisa se vincular a um clube
  MASTER    // Admin global da plataforma
}
```

---

### PapelClube

Papel do usuário dentro de um clube específico.

```prisma
enum PapelClube {
  ADMIN_CLUBE   // Admin do clube
  DIRETORIA     // Diretoria - acesso total às provas, sem unidade fixa
  CONSELHEIRO   // Cria e gerencia provas de sua unidade
  DESBRAVADOR   // Responde provas
}
```

**Regras de unidade**:
- `ADMIN_CLUBE` e `DIRETORIA`: não têm unidade fixa (`unidadeId = null`)
- `CONSELHEIRO` e `DESBRAVADOR`: unidade obrigatória (`unidadeId != null`)

---

### StatusMembro

Status do vínculo de um membro com um clube.

```prisma
enum StatusMembro {
  PENDENTE    // Aguardando aprovação do admin
  ATIVO       // Aprovado, pode acessar recursos
  BLOQUEADO   // Bloqueado pelo admin
}
```

---

### VisibilidadeProva

Controla quem pode visualizar e responder uma prova.

```prisma
enum VisibilidadeProva {
  PRIVADA    // Só criador + diretoria do clube
  UNIDADE    // Conselheiros/desbravadores da mesma unidade + diretoria
  CLUBE      // Todos os membros do clube
  PUBLICA    // Qualquer clube pode visualizar e clonar
}
```

**Ver detalhes em**: `docs/BUSINESS_RULES.md`

---

### TipoQuestao

Tipo de questão.

```prisma
enum TipoQuestao {
  MULTIPLA_ESCOLHA   // Questão com alternativas A, B, C, D, E
  DISSERTATIVA       // Questão aberta (texto livre)
}
```

---

## 🗃️ Migrations

### Histórico de Migrations

| Data | Nome | Descrição |
|------|------|-----------|
| 2025-12-04 | `20251204204105_init_schema` | Schema inicial completo |
| 2025-12-04 | `20251204211245_add_diretoria_role` | Adiciona papel DIRETORIA |

### Comandos Úteis

```bash
# Criar nova migration (development)
npx prisma migrate dev --name descricao_da_mudanca

# Aplicar migrations (production)
npx prisma migrate deploy

# Resetar banco (CUIDADO: apaga tudo)
npx prisma migrate reset

# Gerar Prisma Client
npx prisma generate

# Abrir Prisma Studio (GUI para o banco)
npx prisma studio
```

---

## 🔍 Queries Comuns

### Exemplo 1: Listar provas visíveis para um usuário

```typescript
// Usuário é DESBRAVADOR da unidade 5, clube 1
const provas = await prisma.prova.findMany({
  where: {
    OR: [
      // Provas públicas
      { visibilidade: 'PUBLICA' },
      // Provas do clube
      { clubeId: 1, visibilidade: 'CLUBE' },
      // Provas da unidade do usuário
      { clubeId: 1, unidadeId: 5, visibilidade: 'UNIDADE' },
    ],
  },
  include: {
    questoes: true,
    especialidade: true,
  },
});
```

### Exemplo 2: Verificar se usuário pode editar prova

```typescript
const podeEditar = await prisma.prova.findFirst({
  where: {
    id: provaId,
    OR: [
      // É o criador
      { criadaPorId: userId },
      // É membro da diretoria do clube
      {
        clube: {
          membros: {
            some: {
              usuarioId: userId,
              papel: 'DIRETORIA',
              status: 'ATIVO',
            },
          },
        },
      },
      // É admin do clube
      {
        clube: {
          membros: {
            some: {
              usuarioId: userId,
              papel: 'ADMIN_CLUBE',
              status: 'ATIVO',
            },
          },
        },
      },
    ],
  },
});

return !!podeEditar;
```

### Exemplo 3: Calcular nota de uma resposta

```typescript
const resposta = await prisma.respostaProva.findUnique({
  where: { id: respostaId },
  include: {
    prova: {
      include: {
        questoes: true,
      },
    },
  },
});

let notaObjetiva = 0;
const respostasUsuario = resposta.respostas as Record<string, string>;

for (const questao of resposta.prova.questoes) {
  if (questao.tipo === 'MULTIPLA_ESCOLHA') {
    const respostaUsuario = respostasUsuario[questao.id.toString()];
    if (respostaUsuario === questao.respostaCorreta) {
      notaObjetiva += questao.valor;
    }
  }
}

await prisma.respostaProva.update({
  where: { id: respostaId },
  data: {
    notaObjetiva,
    notaFinal: notaObjetiva, // Atualiza depois se houver dissertativa
    corrigidaAutomaticamente: true,
  },
});
```

---

## 🔒 Segurança

### Row-Level Security (Futuro)

Prisma não suporta RLS nativamente, mas podemos implementar:

1. **Guards no NestJS**: Validam permissões antes de queries
2. **Where clauses dinâmicos**: Sempre filtrar por clube/unidade do usuário
3. **Soft deletes**: Marcar como deletado ao invés de remover do banco

### Prevenção de SQL Injection

Prisma usa **prepared statements** automaticamente - todas as queries são seguras.

### Dados Sensíveis

- Senhas: sempre criptografadas com bcrypt (fator 10+)
- Tokens JWT: armazenados apenas no client (nunca no banco)
- Dados pessoais: considerar LGPD/GDPR no futuro

---

## 📊 Índices e Performance

### Índices Atuais

- `Usuario.email` (unique)
- `Clube.slug` (unique)
- `MembroClube.[usuarioId, clubeId]` (unique composite)

### Índices Futuros (quando necessário)

```prisma
@@index([clubeId, visibilidade])  // Prova - busca por clube e visibilidade
@@index([usuarioId, status])      // MembroClube - membros ativos de um usuário
@@index([provaId])                // Questao - questões de uma prova
```

**Quando adicionar**: Monitorar queries lentas com `EXPLAIN ANALYZE`

---

## 🔄 Backup & Restore

### Backup (PostgreSQL)

```bash
pg_dump -U provas -h localhost -d provas > backup_$(date +%Y%m%d).sql
```

### Restore

```bash
psql -U provas -h localhost -d provas < backup_20251204.sql
```

### Automação (Futuro)

- Backup diário automático
- Retenção: 7 dias (desenvolvimento), 30 dias (produção)
- Testar restore mensalmente

---

## 🧪 Testes com Banco

### Test Database

Criar banco separado para testes:

```env
# .env.test
DATABASE_URL="postgresql://provas:provas123@localhost:5432/provas_test?schema=public"
```

### Setup de Testes

```typescript
// test/setup-e2e.ts
beforeAll(async () => {
  // Aplicar migrations
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL_TEST },
  });
});

afterEach(async () => {
  // Limpar dados entre testes
  await prisma.respostaProva.deleteMany();
  await prisma.questao.deleteMany();
  await prisma.prova.deleteMany();
  // ...
});

afterAll(async () => {
  await prisma.$disconnect();
});
```

---

**Versão**: 0.1.0-beta
**Última atualização**: 2025-12-04
**Schema Prisma**: Ver `prisma/schema.prisma`
